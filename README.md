# URL Checker — сервис асинхронной проверки списка URL

REST API на **NestJS** + фронтенд на **React + TypeScript** для асинхронной
проверки списка URL HTTP HEAD-запросами с фронтендом для отслеживания статуса.

Полное тестовое задание (Fullstack · Node.js · TypeScript · React).

## Стек

| Слой | Технологии |
|---|---|
| Backend | Node.js 20+, TypeScript, NestJS, class-validator, in-memory хранилище |
| Frontend | TypeScript, React 18, Vite, Zustand, Ant Design |
| Mock-сервер | Node.js (`http`), без зависимостей |
| Инфраструктура | Docker, docker-compose, nginx |

## Возможности

- Создание задания на проверку списка URL → фоновая обработка
- Список заданий со статистикой (успех / ошибка / отменено)
- Детальная информация: статус, HTTP-код, ошибка, длительность по каждому URL
- Отмена задания (прекращает обработку не начатых URL)
- Не более 5 одновременных HEAD-запросов на задание, несколько заданий параллельно
- Поллинг статуса с корректной остановкой при смене активного задания

## Быстрый старт

### Через Docker (рекомендуется)

```bash
docker compose up --build
```

После запуска:
- **Фронтенд:** http://localhost:8080
- **Backend API:** http://localhost:4000/api/jobs
- **Mock-сервер (для тестов):** http://localhost:9000

### Локальная разработка

В трёх терминалах:

```bash
# 1. Mock-сервер
cd mock-server && npm start

# 2. Backend (порт 4000)
cd backend && npm install && npm run dev

# 3. Frontend (порт 5173, прокси /api -> :4000)
cd frontend && npm install && npm run dev
```

Фронтенд: http://localhost:5173

## REST API

### `POST /api/jobs` — создать задание

Тело:
```json
{ "urls": ["https://example.com", "https://github.com/some/repo"] }
```

Ответ (201):
```json
{ "jobId": "8742f53a-e0d4-457b-803d-c52bace1394c" }
```

Ошибки: 400 при невалидном payload (пустой массив, не http(s), более 500 URL).

### `GET /api/jobs` — список заданий

```json
[
  {
    "id": "8742f53a-...",
    "createdAt": "2026-07-02T09:34:07.009Z",
    "status": "completed",
    "total": 7,
    "success": 6,
    "error": 1,
    "cancelled": 0
  }
]
```

### `GET /api/jobs/:id` — детальная информация

```json
{
  "id": "8742f53a-...",
  "createdAt": "2026-07-02T09:34:07.009Z",
  "status": "completed",
  "processedCount": 7,
  "total": 7,
  "success": 6,
  "error": 1,
  "cancelled": 0,
  "urls": [
    {
      "url": "https://example.com",
      "status": "success",
      "httpStatus": 200,
      "startedAt": "2026-07-02T09:34:07.009Z",
      "finishedAt": "2026-07-02T09:34:09.682Z",
      "durationMs": 2673
    }
  ]
}
```

Статусы URL: `pending` → `in_progress` → `success` | `error` | `cancelled`.
Статусы задания: `pending` → `in_progress` → `completed` | `cancelled` | `failed`.

### `DELETE /api/jobs/:id` — отменить задание

Помечает задание `cancelled`, не начатые URL → `cancelled`. Уже начатые URL
дорабатывают до результата (согласно требованию «прекращает обработку не
начатых URL»).

## Логика проверки URL (HEAD)

Сервис выполняет только HTTP HEAD-запросы в соответствии с требованиями
тестового задания. Ответы сервера с любым HTTP-статусом (включая
`405 Method Not Allowed` и `501 Not Implemented`) считаются успешно
завершенной проверкой, поскольку сервер корректно обработал запрос и вернул
HTTP-ответ.

Ошибками считаются только ситуации, когда HTTP-ответ не был получен (например,
`timeout`, `DNS error`, `connection refused`, `TLS error`).

Fallback на GET намеренно не реализован, чтобы полностью соответствовать
требованиям задания и не изменять логику проверки URL.

Детали реализации (`backend/src/jobs/url-checker.service.ts`):
- таймаут запроса 15 секунд (через `AbortController`);
- редиректы не следуются автоматически (`redirect: 'manual'`) — фиксируется
  код 3xx;
- перед сохранением результата добавляется случайная задержка 0–10 секунд;
- не более 5 одновременных запросов на задание (`runWithConcurrency`).

## Тестовые данные

Для ручной проверки всех веток логики в комплекте идёт mock-сервер
(`mock-server/server.js`), детерминированно возвращающий нужные статусы:

| URL (в docker) | URL (локально) | Поведение | Ожидаемый статус URL |
|---|---|---|---|
| `http://mock:9000/ok` | `http://localhost:9000/ok` | 200 | success / 200 |
| `http://mock:9000/notfound` | `http://localhost:9000/notfound` | 404 | success / 404 |
| `http://mock:9000/head-not-allowed` | `http://localhost:9000/head-not-allowed` | 405 на HEAD | success / 405 |
| `http://mock:9000/server-error` | `http://localhost:9000/server-error` | 500 | success / 500 |
| `http://mock:9000/redirect` | `http://localhost:9000/redirect` | 302 → /ok | success / 302 |
| `http://mock:9000/slow` | `http://localhost:9000/slow` | ответ через 3с | success / 200 |
| `http://mock:9000/hang` | `http://localhost:9000/hang` | не отвечает | error (timeout) |

> В docker используйте имя сервиса `mock` (`http://mock:9000/...`) — бэкенд
> резолвит его внутри сети compose. При локальном запуске — `localhost:9000`.

**Реальные публичные URL** для демонстрации:
- `https://example.com` → 200
- `https://www.google.com` → 200 / 3xx
- `https://github.com/this-does-not-exist-xyz` → 404
- `http://this-domain-invalid-xyz.invalid` → DNS error
- `http://10.255.255.1` → timeout (неответный адрес)

## Архитектура

### Backend (NestJS)

```
backend/src/
├── main.ts                    # bootstrap, ValidationPipe, CORS
├── app.module.ts
└── jobs/
    ├── jobs.module.ts
    ├── jobs.controller.ts     # REST: POST/GET/GET:id/DELETE
    ├── jobs.service.ts        # оркестрация: createJob/processJob/cancel
    ├── jobs.store.ts          # in-memory Map + AbortController
    ├── url-checker.service.ts # HEAD-запросы (fetch + AbortController)
    ├── concurrency.ts         # пул из 5 одновременных (без зависимостей)
    ├── jobs.constants.ts
    ├── dto/create-job.dto.ts  # class-validator
    └── models/job.model.ts    # доменные типы
```

### Frontend (React + Zustand)

Приложение разделено на три слоя (по требованию задания):

```
frontend/src/
├── api/                  # слой работы с API (типизированные fetch-вызовы)
│   ├── http.ts           # базовый клиент + обработка ошибок
│   ├── jobsApi.ts        # createJob/fetchJobs/fetchJob/cancelJob
│   └── types.ts          # типы, зеркальные бэкенду
├── store/
│   └── jobsStore.ts      # глобальное состояние (Zustand)
├── hooks/
│   └── useJobPolling.ts  # периодический опрос активного задания
└── components/           # компоненты UI (Ant Design)
    ├── JobForm.tsx       # форма создания задания
    ├── JobList.tsx       # список заданий
    ├── JobDetails.tsx    # детали + таблица URL + прогресс + отмена
    └── StatusBadge.tsx   # бейдж статуса
```

**Глобальное состояние** (`store/jobsStore.ts`): список заданий, активное
задание, его детали, состояния загрузки/ошибок.

**Поллинг** (`hooks/useJobPolling.ts`): каждые 2.5с опрашивает
`GET /api/jobs/:id`, пока статус не терминальный. При смене активного задания
или размонтировании предыдущий интервал корректно очищается.

**Защита от устаревших ответов**: в store используется токен поллинга
(`_pollToken`), который инкрементируется при каждой смене активного задания.
После `await` ответ сверяется с текущим токеном — ответы по старому `jobId`
не меняют состояние интерфейса.
