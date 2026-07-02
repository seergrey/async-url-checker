/** Константы бизнес-логики проверки URL. */

/** Таймаут одного HEAD-запроса (мс). */
export const HEAD_TIMEOUT_MS = 15_000;

/** Максимальное число одновременных HEAD-запросов на одно задание. */
export const MAX_CONCURRENCY_PER_JOB = 5;

/** Верхняя граница случайной задержки перед сохранением результата (мс). */
export const MAX_RESULT_DELAY_MS = 10_000;

/** Максимальное количество URL в одном задании. */
export const MAX_URLS_PER_JOB = 500;
