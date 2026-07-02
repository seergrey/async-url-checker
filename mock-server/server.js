/**
 * Mock-сервер для тестирования сервиса проверки URL.
 *
 * Крошечный HTTP-сервер на голом node:http (без зависимостей), который по
 * пути возвращает нужный статус/поведение. Корректно отвечает на HEAD-запросы,
 * чтобы бэкенд получал предсказуемые результаты для каждой ветки логики.
 *
 * Маршруты:
 *   /ok                 -> 200
 *   /notfound           -> 404
 *   /head-not-allowed   -> 405 на HEAD (200 на GET)
 *   /server-error       -> 500
 *   /redirect           -> 302 -> /ok
 *   /slow               -> 200 через 3с (тестирует обычную задержку ответа)
 *   /hang               -> не отвечает (тестирует таймаут бэкенда)
 *
 * Порт: 9000 (PORT env).
 */
const http = require('node:http');

const PORT = Number(process.env.PORT ?? 9000);

/** Безопасная отправка ответа с телом для GET и без тела для HEAD. */
function send(res, req, status, location) {
  // Для HEAD — тело не отправляем, только заголовки (как и должно быть).
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...(location ? { Location: location } : {}),
  });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(`${status}\n`);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  switch (path) {
    case '/ok':
      return send(res, req, 200);

    case '/notfound':
      return send(res, req, 404);

    case '/head-not-allowed':
      // HEAD не поддерживается — 405; GET работает.
      if (req.method === 'HEAD') return send(res, req, 405);
      return send(res, req, 200);

    case '/server-error':
      return send(res, req, 500);

    case '/redirect':
      // 302 на /ok (бэкенд не следует редиректам — redirect: 'manual').
      return send(res, req, 302, '/ok');

    case '/slow':
      // Ответ через 3 секунды (в рамках таймаута бэкенда 15с).
      return setTimeout(() => send(res, req, 200), 3000);

    case '/hang':
      // Не отвечаем вовсе — бэкенд должен уйти в таймаут (15с) -> error.
      // Просто держим соединие открытым, ничего не отправляя.
      return;

    default:
      return send(res, req, 404);
  }
});

server.listen(PORT, () => {
  console.log(`mock-server listening on http://0.0.0.0:${PORT}`);
});
