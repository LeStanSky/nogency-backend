# NoGency AI - Backend API

Backend API для платформы управления арендой недвижимости с AI-скорингом арендаторов.

**Статус:** Production-Ready | 175 тестов | 86%+ coverage

## Технологический стек

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 15 (Supabase)
- **ORM:** Prisma 5.x
- **Testing:** Vitest (TDD approach)
- **AI Integration:** Anthropic Claude API (Vision + Text)
- **Payments:** Stripe
- **Email:** Resend
- **File Storage:** Supabase Storage
- **Authentication:** JWT + bcrypt

## Реализованные API (Updated: 2026-01-16)

### Authentication API

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/api/v1/auth/register` | User registration with JWT   |
| POST   | `/api/v1/auth/login`    | User login with JWT          |
| GET    | `/api/v1/auth/me`       | Get current user (protected) |

### Profile Management API

| Method | Endpoint                  | Description                |
| ------ | ------------------------- | -------------------------- |
| POST   | `/api/v1/profiles/owner`  | Create owner profile       |
| POST   | `/api/v1/profiles/tenant` | Create tenant profile      |
| GET    | `/api/v1/profiles/me`     | Get current user's profile |
| PATCH  | `/api/v1/profiles/me`     | Update profile             |

### Document Upload & AI Verification API

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| POST   | `/api/v1/documents`            | Upload document                 |
| GET    | `/api/v1/documents`            | List user documents             |
| GET    | `/api/v1/documents/:id`        | Get document details            |
| DELETE | `/api/v1/documents/:id`        | Delete document                 |
| POST   | `/api/v1/documents/:id/verify` | AI verification (Claude Vision) |

### Property Management API

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| POST   | `/api/v1/properties`     | Create property         |
| GET    | `/api/v1/properties`     | List owner's properties |
| GET    | `/api/v1/properties/:id` | Get property details    |
| PATCH  | `/api/v1/properties/:id` | Update property         |
| DELETE | `/api/v1/properties/:id` | Delete property         |

### Listing Management API

| Method | Endpoint                         | Description                       |
| ------ | -------------------------------- | --------------------------------- |
| POST   | `/api/v1/listings`               | Create listing from property      |
| GET    | `/api/v1/listings`               | List all active listings (public) |
| GET    | `/api/v1/listings/:id`           | Get listing details               |
| PATCH  | `/api/v1/listings/:id`           | Update listing                    |
| POST   | `/api/v1/listings/:id/publish`   | Publish listing                   |
| POST   | `/api/v1/listings/:id/unpublish` | Unpublish listing                 |

### Application & AI Scoring API

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/v1/applications`            | Submit application             |
| GET    | `/api/v1/applications`            | List applications              |
| GET    | `/api/v1/applications/:id`        | Get application details        |
| POST   | `/api/v1/applications/:id/score`  | AI scoring (Claude)            |
| PATCH  | `/api/v1/applications/:id/status` | Update status (approve/reject) |

### Contract Management API

| Method | Endpoint                                 | Description                      |
| ------ | ---------------------------------------- | -------------------------------- |
| POST   | `/api/v1/contracts`                      | Create contract from application |
| GET    | `/api/v1/contracts`                      | List contracts                   |
| GET    | `/api/v1/contracts/:id`                  | Get contract details             |
| POST   | `/api/v1/contracts/:id/send-for-signing` | Send for signatures              |
| POST   | `/api/v1/contracts/:id/sign`             | Sign contract                    |
| POST   | `/api/v1/contracts/:id/terminate`        | Terminate contract               |

### Payment API (Stripe Integration)

| Method | Endpoint                         | Description                  |
| ------ | -------------------------------- | ---------------------------- |
| POST   | `/api/v1/payments/create-intent` | Create Stripe payment intent |
| GET    | `/api/v1/payments`               | List payments                |
| GET    | `/api/v1/payments/:id`           | Get payment details          |
| POST   | `/api/v1/payments/webhook`       | Stripe webhook handler       |
| GET    | `/api/v1/contracts/:id/payments` | Get payments by contract     |

## Структура проекта

```
nogency-back/
├── src/
│   ├── routes/           # API routes
│   ├── controllers/      # Business logic
│   ├── services/         # External services (AI, Storage, Stripe)
│   ├── middleware/       # Auth middleware
│   ├── schemas/          # Zod validation
│   ├── db/               # Prisma client
│   ├── types/            # TypeScript types
│   ├── config.ts         # Configuration
│   ├── app.ts            # Fastify app
│   └── index.ts          # Entry point
├── tests/                # Test files (175 tests)
├── prisma/               # Database schema
└── package.json
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

**Обязательные переменные:**

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=sk-ant-xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=http://localhost:3000
```

### 2.5. Настройка Git (Line Endings)

Проект использует **LF (Unix-style)** окончания строк для всех файлов. Это обеспечивает совместимость между Windows, Linux и Mac.

**Автоматическая настройка:**

Файл `.gitattributes` уже настроен в репозитории. При первом клонировании выполните:

```bash
# Настроить Git для правильной обработки line endings
git config core.autocrlf input

# Переиндексировать файлы с правильными окончаниями строк
git add --renormalize .
```

**Что это делает:**

- `core.autocrlf input`: конвертирует CRLF → LF при коммите, но не изменяет файлы при checkout
- `.gitattributes`: гарантирует, что все текстовые файлы используют LF в репозитории
- На Windows Git автоматически конвертирует LF → CRLF локально, но в репозитории остается LF

**Важно:** Если вы видите предупреждения `LF will be replaced by CRLF` при `git add`, выполните команды выше.

### 3. База данных

```bash
npm run db:generate    # Generate Prisma Client
npm run db:push        # Push schema (dev)
npm run db:studio      # Open Prisma Studio
```

### 4. Запуск

```bash
npm run dev            # Development (port 8000)
npm run build          # Build
npm start              # Production
```

### 5. Тесты

```bash
npm test               # Watch mode
npm test -- --run      # Single run
npm run test:coverage  # With coverage
```

## Команды NPM

| Command                 | Description             |
| ----------------------- | ----------------------- |
| `npm run dev`           | Dev server (hot-reload) |
| `npm run build`         | Build production        |
| `npm start`             | Run production          |
| `npm test`              | Tests (watch mode)      |
| `npm run test:coverage` | Tests with coverage     |
| `npm run lint`          | ESLint check            |
| `npm run format`        | Prettier format         |
| `npm run db:generate`   | Generate Prisma Client  |
| `npm run db:push`       | Push schema             |
| `npm run db:studio`     | Prisma Studio GUI       |

## Git Workflow

- **`master`** - Production (protected)
- **`dev`** - Development (current)

**Git Hooks:**

- Pre-commit: ESLint + Prettier
- Pre-push (master only): Full tests + build

## Test Coverage

- **175 tests** across 10 test files
- **86%+ overall coverage**
- All APIs fully tested

## Документация

- [NEXT-STEPS.md](./NEXT-STEPS.md) - Development roadmap
- [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) - Git workflow
- [HOOKS.md](./HOOKS.md) - Git hooks
- [CLAUDE.md](./CLAUDE.md) - Claude Code instructions

## Безопасность

- JWT authentication (7 days expiry)
- Password hashing (bcrypt, 10 rounds)
- CORS configured for frontend
- File uploads limited to 10MB
- Input validation via Zod
- SQL injection protection via Prisma
- Stripe webhook signature verification

## License

MIT

---

**Last Updated:** 2026-01-16
**Version:** 1.0.0
**Tests:** 175 passing
