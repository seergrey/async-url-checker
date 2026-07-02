import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { runWithConcurrency } from './concurrency';
import { MAX_CONCURRENCY_PER_JOB, MAX_RESULT_DELAY_MS } from './jobs.constants';
import { JobsStore } from './jobs.store';
import { Job, JobDetails, JobSummary, UrlResult } from './models/job.model';
import { UrlCheckerService } from './url-checker.service';

/**
 * Оркестратор заданий: создание, запуск фоновой обработки, отмена, запросы.
 *
 * Хранилище in-memory (без БД) — см. JobsStore.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly store: JobsStore,
    private readonly checker: UrlCheckerService,
  ) {}

  /** Создать задание и запустить обработку в фоне. */
  createJob(urls: string[]): { jobId: string } {
    const { job, cancelController } = this.store.create(urls);
    this.logger.log(`Job ${job.id} created with ${urls.length} url(s)`);

    // Запускаем обработку без await — отвечаем { jobId } сразу.
    this.processJob(job, cancelController.signal).catch((err) => {
      this.logger.error(
        `Unexpected error processing job ${job.id}: ${err?.stack ?? err}`,
      );
      job.status = 'failed';
    });

    return { jobId: job.id };
  }

  /** Список заданий (краткая информация). */
  getAll(): JobSummary[] {
    return this.store.getAll().map((j) => this.store.toSummary(j));
  }

  /** Детальная информация по заданию. */
  getById(id: string): JobDetails {
    const job = this.store.get(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return this.store.toDetails(job);
  }

  /**
   * Отменить задание: пометить cancelled и прекратить обработку не начатых URL.
   *
   * Согласно ТЗ: «прекращает обработку не начатых URL». Поэтому:
   *  - все URL в статусе pending → cancelled (и очередь их больше не стартует);
   *  - уже начатые URL (in_progress) дорабатывают до результата;
   *  - сигнал отмены прерывает только искусственную задержку перед сохранением
   *    результата у дорабатывающих URL (их результат всё равно сохраняется).
   */
  cancel(id: string): void {
    const job = this.store.get(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    this.store.getCancelController(id)?.abort();

    for (const u of job.urls) {
      if (u.status === 'pending') {
        u.status = 'cancelled';
      }
    }
    if (job.status === 'pending' || job.status === 'in_progress') {
      job.status = 'cancelled';
    }
    this.logger.log(`Job ${id} cancelled`);
  }

  /**
   * Фоновая обработка задания.
   *
   * Для каждого URL (лимит 5 одновременных):
   *  1. если задание уже отменено И URL ещё не начат — помечаем cancelled, skip;
   *  2. startedAt, статус in_progress;
   *  3. HEAD через UrlCheckerService (прерывается только собственным таймаутом);
   *  4. случайная задержка 0–10с ПЕРЕД сохранением результата (прерывается
   *     сигналом отмены задания — но результат сохраняется в любом случае);
   *  5. finishedAt, durationMs, финальный статус (success/error).
   *
   * Статус задания по завершении:
   *  - если было отменено — оставляем cancelled;
   *  - иначе — completed;
   *  - failed — только при необработанном исключении.
   */
  private async processJob(
    job: Job,
    cancelSignal: AbortSignal,
  ): Promise<void> {
    job.status = 'in_progress';

    try {
      await runWithConcurrency(
        job.urls,
        MAX_CONCURRENCY_PER_JOB,
        async (urlResult: UrlResult) => {
          // 1. Отмена до старта — не делаем запрос, помечаем отменённым.
          if (cancelSignal.aborted && urlResult.status === 'pending') {
            urlResult.status = 'cancelled';
            return;
          }

          const startedAt = new Date();
          urlResult.startedAt = startedAt.toISOString();
          urlResult.status = 'in_progress';

          // 3. HEAD-запрос (прерывается только таймаутом, не отменой задания).
          const result = await this.checker.checkUrl(urlResult.url);

          // 4. Искусственная задержка перед сохранением результата.
          await this.randomDelay(cancelSignal);

          const finishedAt = new Date();
          urlResult.finishedAt = finishedAt.toISOString();
          urlResult.durationMs = finishedAt.getTime() - startedAt.getTime();

          // 5. Сохраняем результат (начатые URL дорабатывают до результата).
          if (result.status === 'success') {
            urlResult.status = 'success';
            urlResult.httpStatus = result.httpStatus;
          } else {
            urlResult.status = 'error';
            urlResult.error = result.error;
          }
        },
      );
    } catch (err) {
      this.logger.error(
        `Error processing job ${job.id}: ${err?.stack ?? err}`,
      );
      job.status = 'failed';
      return;
    }

    // Финальный статус задания. Сигнал отмены abort'ится ровно при вызове
    // cancel() — используем его как источник правды (избегаем сужения типа
    // свойства job.status компилятором).
    job.status = cancelSignal.aborted ? 'cancelled' : 'completed';
    this.logger.log(`Job ${job.id} finished with status ${job.status}`);
  }

  /**
   * Случайная задержка 0–MAX_RESULT_DELAY_MS мс перед сохранением результата.
   * Прерывается досрочно сигналом отмены задания.
   */
  private randomDelay(cancelSignal: AbortSignal): Promise<void> {
    const delay = Math.floor(Math.random() * MAX_RESULT_DELAY_MS);
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, delay);
      if (cancelSignal.aborted) {
        clearTimeout(timer);
        resolve();
        return;
      }
      cancelSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
