import { Injectable, Logger } from '@nestjs/common';
import { HEAD_TIMEOUT_MS } from './jobs.constants';

/** Результат проверки одного URL. */
export interface CheckResult {
  /** Статус: success — получили HTTP-ответ; error — сетевая ошибка/таймаут. */
  status: 'success' | 'error';
  /** HTTP-статус ответа (если есть). */
  httpStatus?: number;
  /** Сообщение об ошибке (если есть). */
  error?: string;
}

/**
 * Сервис выполнения HTTP HEAD-запросов.
 *
 * Стратегия (согласована в рамках тестового задания):
 *  - выполняется только HEAD (fallback на GET намеренно не используется);
 *  - любой HTTP-ответ (2xx/3xx/4xx/5xx, включая 405/501) считается успехом —
 *    сервер корректно обработал запрос и вернул HTTP-ответ;
 *  - ошибкой считается только отсутствие HTTP-ответа: таймаут, DNS-ошибка,
 *    отказ соединения (ECONNREFUSED/ECONNRESET), ошибки TLS и т.п.
 *
 * Используется встроенный fetch (Node 20+) с AbortController для таймаута.
 *
 * Важно: сигнал отмены задания сюда НЕ передаётся. Согласно ТЗ отмена
 * «прекращает обработку не начатых URL», а уже начатые дорабатывают до
 * результата. Поэтому запрос прерывается только собственным таймаутом, а
 * отменой — лишь очередь и задержка перед сохранением результата.
 */
@Injectable()
export class UrlCheckerService {
  private readonly logger = new Logger(UrlCheckerService.name);

  async checkUrl(
    url: string,
    options: { timeoutMs?: number } = {},
  ): Promise<CheckResult> {
    const timeoutMs = options.timeoutMs ?? HEAD_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(
      () => timeoutController.abort(),
      timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: timeoutController.signal,
      });
      // Получили HTTP-ответ — это успех (независимо от кода).
      return { status: 'success', httpStatus: response.status };
    } catch (err) {
      const message = this.describeError(err);
      return { status: 'error', error: message };
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  /** Человекочитаемое описание ошибки fetch. */
  private describeError(err: unknown): string {
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return `timeout after ${HEAD_TIMEOUT_MS}ms`;
      }
      // Node fetch кладёт код ошибки в cause.code (ENOTFOUND, ECONNREFUSED, ...).
      const cause = (err as { cause?: { code?: string } }).cause;
      if (cause?.code) {
        return `${cause.code}: ${err.message}`;
      }
      return err.message;
    }
    this.logger.warn(`Unexpected error type checking url: ${String(err)}`);
    return String(err);
  }
}
