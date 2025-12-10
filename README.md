# NoGency AI - Backend API

Backend API для платформы управления арендой недвижимости с AI-скорингом арендаторов.

## Технологический стек

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 15 (Supabase)
- **ORM:** Prisma 5.x
- **Testing:** Vitest
- **AI Integration:** Anthropic Claude API
- **Payments:** Stripe
- **Email:** Resend
- **File Storage:** Supabase Storage

## Структура проекта

```
nogency-back/
├── src/
│   ├── routes/          # API маршруты
│   ├── controllers/     # Контроллеры бизнес-логики
│   ├── services/        # Сервисы (AI, Storage, Email)
│   ├── middleware/      # Middleware (auth, validation)
│   ├── db/              # Database client
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты
│   ├── config.ts        # Конфигурация приложения
│   ├── app.ts           # Fastify приложение
│   └── index.ts         # Точка входа
├── tests/               # Тесты (Vitest)
├── prisma/              # Prisma schema и миграции
├── .env.example         # Пример переменных окружения
└── package.json
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

Обязательные переменные:

- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `SUPABASE_URL` - URL вашего Supabase проекта
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `JWT_SECRET` - Секретный ключ для JWT токенов

### 3. Настройка базы данных

```bash
# Генерация Prisma Client
npm run db:generate

# Применение миграций
npm run db:migrate

# Открыть Prisma Studio (GUI для БД)
npm run db:studio
```

### 4. Запуск в режиме разработки

```bash
npm run dev
```

Сервер запустится на `http://localhost:8000`

## Команды NPM

### Разработка

- `npm run dev` - Запуск dev сервера с hot-reload
- `npm run build` - Сборка production версии
- `npm start` - Запуск production сервера

### Тестирование (TDD)

- `npm test` - Запуск тестов в watch mode
- `npm run test:ui` - Запуск тестов с UI интерфейсом
- `npm run test:coverage` - Запуск тестов с coverage

### База данных

- `npm run db:generate` - Генерация Prisma Client
- `npm run db:migrate` - Создание и применение миграций
- `npm run db:push` - Быстрый push схемы (для dev)
- `npm run db:studio` - Открыть Prisma Studio

### Code Quality

- `npm run lint` - Проверка кода ESLint
- `npm run format` - Форматирование кода Prettier

### Версионирование

- `npm run release:patch` - Patch version (1.0.0 → 1.0.1)
- `npm run release:minor` - Minor version (1.0.0 → 1.1.0)
- `npm run release:major` - Major version (1.0.0 → 2.0.0)
- `npm run release` - Build + Test + Patch version

## Git Hooks (обязательные проверки)

Проект использует Husky для автоматической проверки качества кода:

### Pre-commit Hook

- ✅ ESLint (Google Style Guide) + auto-fix
- ✅ Prettier форматирование
- ✅ Проверяются только staged файлы

**Коммит блокируется** если есть ошибки линтинга.

### Pre-push Hook (только для master)

- ✅ ESLint полная проверка
- ✅ Все тесты с coverage
- ✅ TypeScript build

**Push в master блокируется** если тесты не проходят или есть ошибки.

📖 Подробнее: [HOOKS.md](./HOOKS.md) | Краткая справка: [HOOKS-SUMMARY.md](./HOOKS-SUMMARY.md)

## Git Workflow

- **`master`** - production ветка (только stable код)
- **`dev`** - основная разработка
- **`feature/*`** - опциональные feature ветки

📖 Подробнее: [GIT-WORKFLOW.md](./GIT-WORKFLOW.md)

## API Endpoints (Planned)

### Week 1-2

- `POST /api/v1/auth/register` - Регистрация пользователя
- `POST /api/v1/auth/login` - Вход пользователя
- `GET /api/v1/auth/me` - Получить текущего пользователя
- `POST /api/v1/documents` - Загрузить документ
- `GET /api/v1/documents` - Список документов
- `GET /api/v1/documents/:id` - Детали документа
- `POST /api/v1/documents/:id/verify` - AI верификация документа
- `DELETE /api/v1/documents/:id` - Удалить документ
- `POST /api/v1/listings` - Создать листинг
- `GET /api/v1/listings` - Список листингов
- `GET /api/v1/owner/listings` - Листинги владельца

### Week 3-4 (Planned)

- `POST /api/v1/applications` - Подать заявку на аренду
- `GET /api/v1/applications` - Список заявок
- `POST /api/v1/applications/:id/score` - AI скоринг заявки
- `POST /api/v1/contracts` - Создать контракт
- `GET /api/v1/contracts/:id/pdf` - Скачать PDF контракта

### Week 5-6 (Planned)

- `POST /api/v1/payments/create-intent` - Создать Payment Intent (Stripe)
- `POST /api/v1/payments/webhook` - Webhook от Stripe

## Разработка с TDD

### Процесс TDD (Red-Green-Refactor)

1. **Red** - Написать failing тест
2. **Green** - Написать минимальный код для прохождения теста
3. **Refactor** - Улучшить код без изменения функциональности

### Пример workflow

```bash
# 1. Запустить тесты в watch mode
npm test

# 2. Создать failing тест
# tests/auth.test.ts

# 3. Написать реализацию
# src/controllers/auth.controller.ts

# 4. Тесты проходят - refactor

# 5. Commit
git add .
git commit -m "feat: add user registration"
```

## Следующие шаги (Day 1-2 План)

### Задачи для реализации

#### 1. Настройка Supabase проекта

- [ ] Создать проект на Supabase
- [ ] Скопировать DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
- [ ] Настроить Storage buckets для документов
- [ ] Применить Prisma миграции

#### 2. Auth endpoints (TDD)

- [ ] Написать тест для `POST /auth/register`
- [ ] Реализовать registration controller
- [ ] Написать тест для `POST /auth/login`
- [ ] Реализовать login controller + JWT
- [ ] Написать auth middleware для защиты routes

#### 3. Health & Testing

- [ ] Проверить health check endpoint
- [ ] Убедиться что все тесты проходят
- [ ] Coverage > 80%

### Day 3-4: Document Upload

- [ ] Настроить Supabase Storage buckets
- [ ] Middleware для file upload
- [ ] `POST /documents` endpoint
- [ ] Тесты для upload

### Day 5-7: Documents API

- [ ] `GET /documents` - список документов
- [ ] `GET /documents/:id` - детали
- [ ] `DELETE /documents/:id` - удаление
- [ ] Row-level security

### Day 8-10: AI Document Verification

- [ ] Интеграция Anthropic SDK
- [ ] `POST /documents/:id/verify` endpoint
- [ ] Парсинг AI response
- [ ] Тесты с mock AI responses

### Day 11-14: Listings CRUD

- [ ] `POST /listings` - создание листинга
- [ ] `GET /listings` - список всех
- [ ] `GET /owner/listings` - листинги владельца
- [ ] Upload фото листингов

## Требования к окружению

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+ (или Supabase аккаунт)
- Git

## Безопасность

- Все sensitive данные в `.env` (не коммитить!)
- JWT tokens для аутентификации
- CORS настроен на frontend URL
- File uploads ограничены 10MB
- Row-level security в Supabase
- Input validation через Zod schemas

## Deployment (Planned)

Рекомендуемые платформы:

- **Railway.app** ($5/месяц)
- **Render.com** (бесплатный tier)

## Лицензия

MIT

## Автор

Stas - NoGency AI Team
