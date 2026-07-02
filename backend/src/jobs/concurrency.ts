/**
 * Запустить асинхронный обработчик над массивом элементов с ограничением
 * одновременных выполнений. Порядок результатов не гарантирован — обработчик
 * обновляет состояние напрямую.
 *
 * Реализация — счётчик активных задач + очередь на промисах, без внешних
 * зависимостей.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  let active = 0;
  let cursor = 0;

  return new Promise((resolve) => {
    const next = () => {
      // Все элементы обработаны и нет активных задач — завершаемся.
      if (cursor >= queue.length && active === 0) {
        resolve();
        return;
      }
      // Пока есть свободные слоты и элементы в очереди — запускаем.
      while (active < limit && cursor < queue.length) {
        const { item, index } = queue[cursor];
        cursor++;
        active++;
        worker(item, index)
          .catch(() => {
            /* ошибки обрабатываются внутри worker'а */
          })
          .finally(() => {
            active--;
            next();
          });
      }
    };
    next();
  });
}
