# Travel Days

Telegram Mini App для учёта дней, проведённых в разных странах. Требования — в [SPEC.md](SPEC.md) (раздел 10 содержит уточнения MVP).

## Структура

```
apps/api        Fastify API, Drizzle, миграции PostgreSQL
apps/mini-app   React + Vite, интерфейс Mini App
packages/shared Zod-схемы и типы API, общие для API и Mini App
```

## Локальная разработка

Нужны Node.js 24 и Docker.

```bash
npm install
cp .env.example .env          # вписать BOT_TOKEN от @BotFather
npm run db:up                 # PostgreSQL на 127.0.0.1:5433
npm run db:migrate
npm run dev:api               # http://127.0.0.1:3000
npm run dev:mini-app          # http://localhost:5173, /api проксируется на API
```

Вне Telegram у страницы нет initData. Для браузера подпишите его токеном бота:

```bash
npm run dev:init-data           # пользователь Telegram с id 1
npm run dev:init-data -- 12345  # другой id
```

Скрипт пишет `apps/mini-app/.env.development.local` (не коммитится). Подпись действует 24 часа; после этого перезапустите скрипт и Vite. Сервер проверяет такие данные так же, как настоящие — обхода авторизации нет.

## Проверки

```bash
npm run check             # typecheck + lint + format:check + все тесты
npm run test:unit         # без базы данных
npm run test:integration  # нужна запущенная БД (npm run db:up)
npm run typecheck
npm run lint
npm run format            # исправить форматирование
```

Интеграционные тесты используют базу `travel_days_test` и пересоздают её схему при каждом запуске.
