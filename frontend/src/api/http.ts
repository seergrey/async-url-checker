/**
 * Базовый HTTP-клиент.
 *
 * Базовый URL берётся из VITE_API_BASE_URL (используется в прод-сборке, где
 * nginx отдаёт фронт и проксирует /api). В dev работает Vite-прокси, поэтому
 * базовый путь — просто '/api'.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = Array.isArray(body.message) ? body.message.join('; ') : body.message ?? message;
    } catch {
      // тело может быть пустым
    }
    throw new ApiError(response.status, message);
  }

  // 200/201 с телом
  return response.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
