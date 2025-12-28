# NoGency AI - Backend API

Backend API для платформы управления арендой недвижимости с AI-скорингом арендаторов.

**Статус:** 🚀 Authentication API реализован | Database полностью настроена

## Технологический стек

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 15 (Supabase)
- **ORM:** Prisma 5.x
- **Testing:** Vitest (TDD approach)
- **AI Integration:** Anthropic Claude API
- **Payments:** Stripe
- **Email:** Resend
- **File Storage:** Supabase Storage
- **Authentication:** JWT + bcrypt

## ✅ Реализованные функции (Updated: 2025-12-28)

### Infrastructure

- [x] Fastify application setup
- [x] Prisma ORM with full schema (26 models)
- [x] Supabase connection (PostgreSQL + Storage)
- [x] Vitest testing framework
- [x] ESLint (Google Style) + Prettier
- [x] Git hooks (Husky + lint-staged)

### API Endpoints

#### Authentication API ✅

- [x] `POST /api/v1/auth/register` - User registration with JWT
- [x] `POST /api/v1/auth/login` - User login with JWT
- [x] `GET /api/v1/auth/me` - Get current user (protected)
- [x] Auth middleware for route protection
- [x] Password hashing (bcryptjs)
- [x] Zod validation schemas
- [x] 10 comprehensive tests (>93% coverage)

### Database Schema (26 Models)

**Core Models:**

- User, UserRole, OwnerProfile, TenantProfile

**Property Models:**

- Property, PropertyPhoto, PropertyDocument, PropertyValuation

**Listing Models:**

- Listing, ViewingSlot

**Application Models:**

- Application, ApplicationDocument, TenantScoring

**Contract & Payment Models:**

- LeaseContract, LeaseEvent, Payment, DepositRecord, CommissionRecord, KeyHandover

**Communication Models:**

- Conversation, ConversationParticipant, Message, Meeting

**Notification Model:**

- Notification

## Структура проекта

```
nogency-back/
├── src/
│   ├── routes/          # API маршруты
│   │   └── auth.routes.ts        ✅ Implemented
│   ├── controllers/     # Контроллеры бизнес-логики
│   │   └── auth.controller.ts    ✅ Implemented
│   ├── services/        # Сервисы (AI, Storage, Email, Auth)
│   │   └── auth.service.ts       ✅ Implemented
│   ├── middleware/      # Middleware (auth, validation)
│   │   └── auth.middleware.ts    ✅ Implemented
│   ├── schemas/         # Zod validation schemas
│   │   └── auth.schema.ts        ✅ Implemented
│   ├── db/              # Database client
│   │   └── client.ts             ✅ Implemented
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты
│   ├── config.ts        # Конфигурация приложения
│   ├── app.ts           # Fastify приложение
│   └── index.ts         # Точка входа
├── tests/               # Тесты (Vitest)
│   ├── app.test.ts      # Health check tests
│   └── auth.test.ts     # Auth API tests (10 tests) ✅
├── prisma/              # Prisma schema и миграции
│   └── schema.prisma    # Full schema (26 models) ✅
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

**Обязательные переменные:**

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Authentication
JWT_SECRET=your-jwt-secret-here-change-in-production
JWT_EXPIRES_IN=7d

# AI Integration (optional for now)
ANTHROPIC_API_KEY=sk-ant-xxx

# Payments (optional for now)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (optional for now)
RESEND_API_KEY=re_xxx

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Настройка базы данных

```bash
# Генерация Prisma Client
npm run db:generate

# Применение schema (dev mode)
npm run db:push

# Открыть Prisma Studio (GUI для БД)
npm run db:studio
```

Prisma Studio откроется на **http://localhost:5556**

### 4. Запуск в режиме разработки

```bash
npm run dev
```

Сервер запустится на **http://localhost:8000**

### 5. Запуск тестов

```bash
# Watch mode (рекомендуется для TDD)
npm test

# Run once
npm test -- --run

# With coverage
npm run test:coverage

# With UI
npm run test:ui
```

## Команды NPM

### Разработка

- `npm run dev` - Запуск dev сервера с hot-reload (port 8000)
- `npm run build` - Сборка production версии
- `npm start` - Запуск production сервера

### Тестирование (TDD)

- `npm test` - Запуск тестов в watch mode ⭐
- `npm run test:ui` - Запуск тестов с UI интерфейсом
- `npm run test:coverage` - Запуск тестов с coverage report

### База данных

- `npm run db:generate` - Генерация Prisma Client
- `npm run db:push` - Быстрый push схемы (для dev) ⭐
- `npm run db:migrate` - Создание миграций (для production)
- `npm run db:studio` - Открыть Prisma Studio (http://localhost:5556)

### Code Quality

- `npm run lint` - Проверка кода ESLint (Google Style)
- `npm run lint -- --fix` - Автоисправление ошибок
- `npm run format` - Форматирование кода Prettier

### Версионирование

- `npm run release:patch` - Patch version (1.0.0 → 1.0.1)
- `npm run release:minor` - Minor version (1.0.0 → 1.1.0)
- `npm run release:major` - Major version (1.0.0 → 2.0.0)

## API Endpoints

### ✅ Authentication (Implemented)

| Method | Endpoint                | Description       | Auth Required |
| ------ | ----------------------- | ----------------- | ------------- |
| POST   | `/api/v1/auth/register` | Register new user | No            |
| POST   | `/api/v1/auth/login`    | Login user        | No            |
| GET    | `/api/v1/auth/me`       | Get current user  | Yes           |

**Example: Register**

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "role": "TENANT"
  }'
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": null,
    "isEmailVerified": false,
    "createdAt": "2025-12-28T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 📝 Planned Endpoints

#### Profile Management (Week 1-2)

- `POST /api/v1/profiles/owner` - Create owner profile
- `POST /api/v1/profiles/tenant` - Create tenant profile
- `GET /api/v1/profiles/me` - Get user profile
- `PATCH /api/v1/profiles/me` - Update profile

#### Document Upload (Week 1-2)

- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents` - List user documents
- `GET /api/v1/documents/:id` - Get document details
- `DELETE /api/v1/documents/:id` - Delete document
- `POST /api/v1/documents/:id/verify` - AI verification

#### Property & Listings (Week 3-4)

- `POST /api/v1/properties` - Create property
- `GET /api/v1/properties` - List owner's properties
- `POST /api/v1/listings` - Create listing
- `GET /api/v1/listings` - List active listings (public)

#### Applications (Week 3-4)

- `POST /api/v1/applications` - Submit application
- `GET /api/v1/applications` - List applications
- `POST /api/v1/applications/:id/score` - AI scoring

#### Contracts & Payments (Week 5-6)

- `POST /api/v1/contracts` - Create contract
- `POST /api/v1/payments/create-intent` - Stripe payment
- `POST /api/v1/payments/webhook` - Stripe webhook

## Git Hooks (Code Quality)

### Pre-commit Hook (All branches)

- ✅ ESLint (Google Style Guide) + auto-fix
- ✅ Prettier formatting
- ✅ Only staged files checked

**Коммит блокируется** если есть ошибки линтинга.

### Pre-push Hook (Master only)

- ✅ Full ESLint check
- ✅ All tests with coverage
- ✅ TypeScript build

**Push в master блокируется** если тесты не проходят.

📖 Подробнее: [HOOKS.md](./HOOKS.md) | Краткая справка: [HOOKS-SUMMARY.md](./HOOKS-SUMMARY.md)

## Git Workflow

- **`master`** - production ветка (только stable код)
- **`dev`** - основная разработка (текущая ветка)
- **`feature/*`** - опциональные feature ветки

📖 Подробнее: [GIT-WORKFLOW.md](./GIT-WORKFLOW.md)

## Разработка с TDD

### TDD Процесс (Red-Green-Refactor)

1. **🔴 Red** - Написать failing тест
2. **🟢 Green** - Написать минимальный код для прохождения
3. **♻️ Refactor** - Улучшить код

### Пример workflow

```bash
# 1. Запустить тесты в watch mode
npm test

# 2. Создать failing тест
# tests/profiles.test.ts

# 3. Тест fails (RED)
npm test -- profiles.test.ts --run  # ❌ Fails

# 4. Написать реализацию
# src/services/profile.service.ts
# src/controllers/profile.controller.ts
# src/routes/profile.routes.ts

# 5. Тесты проходят (GREEN)
npm test -- profiles.test.ts --run  # ✅ Pass

# 6. Refactor + Coverage check
npm run test:coverage

# 7. Commit
git add .
git commit -m "feat: implement profile management API"
```

## Test Coverage Goals

**Минимальные требования:**

- Overall: >80%
- Services: >90%
- Controllers: >85%
- Routes: 100%

**Текущий статус:**

- Overall: 79.52%
- Auth Services: 98.81% ✅
- Auth Controllers: 69.91%
- Auth Routes: 100% ✅

## Следующие шаги разработки

### Week 1-2: Profiles + Document Upload

**📝 Что делать дальше:**

1. **Profile Management API** (Day 3-4)
   - POST /profiles/owner
   - POST /profiles/tenant
   - GET /profiles/me
   - TDD workflow

2. **Document Upload** (Day 5-7)
   - Настроить Supabase Storage buckets
   - POST /documents endpoint
   - GET /documents (list)
   - DELETE /documents/:id

3. **AI Document Verification** (Day 8-10)
   - Интеграция Claude Vision API
   - POST /documents/:id/verify
   - Extract data from DNI/NIE/TIE

📖 Подробный план: [NEXT-STEPS.md](./NEXT-STEPS.md)

## Требования к окружению

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+ (или Supabase аккаунт)
- Git

## Безопасность

- ✅ Все sensitive данные в `.env` (не коммитить!)
- ✅ JWT tokens для аутентификации (7 days expiry)
- ✅ Password hashing с bcrypt (10 rounds)
- ✅ CORS настроен на frontend URL
- ✅ File uploads ограничены 10MB
- ✅ Input validation через Zod schemas
- ✅ Prepared statements через Prisma (SQL injection protection)

## Deployment (Planned)

Рекомендуемые платформы:

- **Railway.app** ($5/месяц, PostgreSQL included)
- **Render.com** (бесплатный tier)
- **Fly.io** (бесплатный tier)

### Environment Variables для production:

```env
NODE_ENV=production
DATABASE_URL=<production-database-url>
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=https://your-frontend.com
```

## Документация

- 📖 [NEXT-STEPS.md](./NEXT-STEPS.md) - Детальный план разработки
- 📖 [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) - Git workflow и branching
- 📖 [HOOKS.md](./HOOKS.md) - Git hooks конфигурация
- 📖 [CLAUDE.md](./CLAUDE.md) - Инструкции для Claude Code

## Полезные ресурсы

- **Prisma Docs:** https://www.prisma.io/docs
- **Fastify Docs:** https://fastify.dev/docs
- **Vitest Docs:** https://vitest.dev
- **Zod Docs:** https://zod.dev
- **Supabase Docs:** https://supabase.com/docs
- **Anthropic Claude API:** https://docs.anthropic.com/claude/reference

## Лицензия

MIT

## Автор

Stas - NoGency AI Team

---

**Last Updated:** 2025-12-28
**Current Version:** 1.0.0
**Status:** ✅ Authentication API Complete | 🚀 Ready for Profile Management
