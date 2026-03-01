# Integration Notes: nogency-back + nogency-ai

**Дата анализа:** 2026-02-01
**Цель:** Интеграция бэкенда и фронтенда в единый рабочий проект

---

## Проект 1: Бэкенд (nogency-back)

**Путь:** `C:\Users\stale\Documents\Projects\JS Projects\nogency-back`

### Технический стек

| Компонент  | Технология                        |
| ---------- | --------------------------------- |
| Framework  | Fastify 4.28                      |
| Language   | TypeScript 5.3                    |
| ORM        | Prisma 5.22                       |
| Database   | PostgreSQL 15 (Supabase)          |
| Auth       | JWT tokens                        |
| AI         | Anthropic Claude                  |
| Payments   | Stripe                            |
| Validation | Zod                               |
| Testing    | Vitest (233 tests, 86%+ coverage) |

### Конфигурация сервера

- **Порт:** `8000` (переменная `PORT`)
- **CORS origin:** из `FRONTEND_URL` (по умолчанию `http://localhost:3000`)
- **API prefix:** `/api/v1`

### Основные endpoints

| API          | Prefix                 | Описание                                 |
| ------------ | ---------------------- | ---------------------------------------- |
| Auth         | `/api/v1/auth`         | Регистрация, логин, JWT                  |
| Profiles     | `/api/v1/profiles`     | Профили владельцев/арендаторов           |
| Documents    | `/api/v1/documents`    | Загрузка, AI верификация (Claude Vision) |
| Properties   | `/api/v1/properties`   | CRUD недвижимости                        |
| Listings     | `/api/v1/listings`     | Объявления, публикация                   |
| Applications | `/api/v1/applications` | Заявки с AI скорингом                    |
| Contracts    | `/api/v1/contracts`    | Жизненный цикл контрактов                |
| Payments     | `/api/v1/payments`     | Stripe интеграция, webhooks              |
| Health       | `/health`              | Проверка здоровья                        |
| Docs         | `/docs`                | Swagger UI                               |

### Команды запуска

```bash
npm install          # Установка зависимостей
npm run dev          # Dev сервер с hot-reload (порт 8000)
npm run build        # TypeScript компиляция
npm start            # Production запуск
npm test             # Тесты в watch режиме
npm run test:coverage # Тесты с покрытием
```

### Переменные окружения (.env)

**Обязательные:**

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
JWT_SECRET=your-secret-here
FRONTEND_URL=http://localhost:3000
```

**Опциональные:**

```env
NODE_ENV=development
PORT=8000
RESEND_API_KEY=
JWT_EXPIRES_IN=7d
SENTRY_DSN=
LOG_LEVEL=info
```

### Ключевые файлы

- `src/config.ts` - Централизованная конфигурация
- `src/app.ts` - Fastify application factory
- `src/index.ts` - Entry point
- `src/routes/*.ts` - Route handlers
- `src/controllers/*.ts` - Business logic
- `src/services/*.ts` - External services (AI, Storage, Stripe)
- `prisma/schema.prisma` - Database schema

---

## Проект 2: Фронтенд (nogency-ai)

**Путь:** `C:\Users\stale\Documents\Projects\JS Projects\nogency-ai`

### Технический стек

| Компонент       | Технология                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 16.0.10              |
| React           | 19.0.1                       |
| Language        | TypeScript 5.6.3             |
| ORM             | Drizzle ORM                  |
| Database        | PostgreSQL (собственная)     |
| Auth            | NextAuth 5.0.0-beta.25       |
| AI              | Groq LLM                     |
| Styling         | TailwindCSS 4.1.13           |
| UI              | Radix UI + Custom components |
| Package Manager | pnpm 9.12.3                  |

### Конфигурация сервера

- **Порт:** `3000` (стандартный Next.js)
- **API routes:** Встроенные в Next.js (`app/api/...`)

### Внутренние API endpoints (Next.js routes)

| Endpoint            | Метод  | Описание                       |
| ------------------- | ------ | ------------------------------ |
| `/api/auth/*`       | \*     | NextAuth handlers              |
| `/api/chat`         | POST   | Отправка сообщения (streaming) |
| `/api/chat?id=...`  | DELETE | Удаление чата                  |
| `/api/history`      | GET    | История чатов                  |
| `/api/vote`         | POST   | Лайк/дизлайк                   |
| `/api/document`     | POST   | Создание документа             |
| `/api/files/upload` | POST   | Загрузка файлов                |
| `/api/suggestions`  | POST   | AI предложения                 |

### Команды запуска

```bash
pnpm install         # Установка зависимостей
pnpm dev             # Dev сервер (порт 3000)
pnpm build           # Production build
pnpm start           # Production запуск
```

### Переменные окружения (.env)

```env
AUTH_SECRET=****
GROQ_API_KEY=****
POSTGRES_URL=****
REDIS_URL=****
BLOB_READ_WRITE_TOKEN=****
```

### Ключевые файлы

- `next.config.ts` - Next.js конфигурация
- `proxy.ts` - Middleware/Proxy настройки
- `app/(auth)/auth.ts` - NextAuth конфигурация
- `app/(chat)/api/chat/route.ts` - Основной chat endpoint
- `lib/ai/providers.ts` - Groq AI конфигурация
- `lib/db/schema.ts` - Drizzle ORM schema
- `lib/utils.ts` - Fetch helpers

---

## Текущее состояние

### Проблема: Проекты полностью независимы

1. **Разные базы данных** - бэкенд использует Supabase PostgreSQL, фронтенд свою PostgreSQL
2. **Разная аутентификация** - бэкенд JWT, фронтенд NextAuth
3. **Разные AI провайдеры** - бэкенд Claude, фронтенд Groq
4. **Фронтенд не вызывает бэкенд** - использует собственные API routes

### Что представляют проекты

- **Бэкенд (nogency-back):** API платформы управления арендой с AI-скорингом арендаторов
- **Фронтенд (nogency-ai):** AI чат-бот для консультаций по недвижимости

---

## План интеграции

### Этап 1: Параллельный запуск (базовый)

**Терминал 1 - Бэкенд:**

```bash
cd C:\Users\stale\Documents\Projects\JS Projects\nogency-back
npm run dev
# http://localhost:8000
```

**Терминал 2 - Фронтенд:**

```bash
cd C:\Users\stale\Documents\Projects\JS Projects\nogency-ai
pnpm dev
# http://localhost:3000
```

**Проверка связи:**

- Бэкенд: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`
- Фронтенд: `http://localhost:3000`

### Этап 2: Настройка CORS

**Бэкенд `.env`:**

```env
FRONTEND_URL=http://localhost:3000
```

### Этап 3: API клиент на фронтенде

Создать `lib/api/backend-client.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function backendFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
}

// Примеры использования:
export const authAPI = {
  login: (email: string, password: string) =>
    backendFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: RegisterData) =>
    backendFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const propertiesAPI = {
  list: () => backendFetch('/properties'),
  get: (id: string) => backendFetch(`/properties/${id}`),
  create: (data: PropertyData) =>
    backendFetch('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

**Фронтенд `.env`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Этап 4: Синхронизация аутентификации

**Вариант A: Фронтенд использует JWT от бэкенда**

- При логине вызывать `/api/v1/auth/login`
- Сохранять JWT в cookies/localStorage
- Передавать JWT в заголовке `Authorization: Bearer <token>`

**Вариант B: Общая база пользователей**

- Синхронизировать схемы User между Prisma и Drizzle
- Использовать одну PostgreSQL базу

**Вариант C: Прокси через Next.js**

- Next.js API routes проксируют запросы к бэкенду
- NextAuth выдаёт токен, Next.js добавляет его к запросам

### Этап 5: Интеграция функционала

Подключить на фронтенде:

1. **Регистрация/Логин** → `/api/v1/auth`
2. **Профили** → `/api/v1/profiles`
3. **Загрузка документов** → `/api/v1/documents`
4. **Управление недвижимостью** → `/api/v1/properties`
5. **Объявления** → `/api/v1/listings`
6. **Заявки** → `/api/v1/applications`
7. **Контракты** → `/api/v1/contracts`
8. **Платежи** → `/api/v1/payments`

---

## Варианты архитектуры

### Вариант 1: AI чат + арендная платформа (гибридный)

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │
│  (Next.js)      │     │  (Fastify)      │
│                 │     │                 │
│  - AI Chat      │     │  - Auth API     │
│  - UI           │     │  - Properties   │
│  - NextAuth     │     │  - Documents    │
│                 │     │  - Payments     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌─────────┐
    │  Groq   │            │ Claude  │
    │  (Chat) │            │ (Docs)  │
    └─────────┘            └─────────┘
```

### Вариант 2: Единый бэкенд (полная интеграция)

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │
│  (Next.js)      │     │  (Fastify)      │
│                 │     │                 │
│  - UI только    │     │  - Всё API      │
│  - Нет своих    │     │  - Auth         │
│    API routes   │     │  - AI (Claude)  │
│                 │     │  - DB           │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                           ┌─────────┐
                           │ Claude  │
                           └─────────┘
```

### Вариант 3: Микросервисы (расширенный)

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │
│  (Next.js API)  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Backend│ │ AI    │
│(Rent) │ │(Chat) │
└───────┘ └───────┘
```

---

## Чеклист интеграции

- [ ] Запустить оба сервиса параллельно
- [ ] Проверить CORS настройки
- [ ] Создать API клиент на фронтенде
- [ ] Выбрать стратегию аутентификации
- [ ] Синхронизировать или объединить базы данных
- [ ] Добавить UI компоненты для бэкенд функций
- [ ] Интегрировать формы регистрации/логина
- [ ] Добавить страницы управления недвижимостью
- [ ] Подключить загрузку документов
- [ ] Интегрировать платежи (Stripe)
- [ ] Тестирование E2E

---

## Полезные ссылки

- Backend Swagger: `http://localhost:8000/docs`
- Backend Health: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`

---

**Последнее обновление:** 2026-02-01
