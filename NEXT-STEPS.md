# Дальнейшие шаги разработки (TDD подход)

## Текущий статус проекта

Проект успешно инициализирован и настроен:
- Node.js + TypeScript ✅
- Fastify framework ✅
- Prisma ORM ✅
- Vitest для TDD ✅
- Git репозиторий ✅
- Структура проекта ✅
- Health check endpoint ✅

## Day 1-2: Authentication API (Следующий шаг)

### Подготовка

1. **Создать Supabase проект**
   ```bash
   # Зарегистрироваться на https://supabase.com
   # Создать новый проект
   # Скопировать credentials в .env файл
   ```

2. **Применить Prisma миграции**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

### TDD Workflow для Authentication

#### 1. Registration Endpoint (POST /api/v1/auth/register)

**Red Phase - Написать failing тест:**
```typescript
// tests/auth.test.ts

describe('POST /api/v1/auth/register', () => {
  it('should register a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
        fullName: 'Test User',
        role: 'TENANT',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('token');
    expect(body.user).toHaveProperty('email', 'test@example.com');
  });

  it('should return 400 for invalid email', async () => {
    // Test validation
  });

  it('should return 409 if email already exists', async () => {
    // Test duplicate email
  });
});
```

**Green Phase - Минимальная реализация:**
```typescript
// src/routes/auth.routes.ts
// src/controllers/auth.controller.ts
// src/services/auth.service.ts
```

**Refactor Phase:**
- Улучшить структуру кода
- Добавить validation с Zod
- Добавить proper error handling

#### 2. Login Endpoint (POST /api/v1/auth/login)

**Red Phase - Написать тест:**
```typescript
describe('POST /api/v1/auth/login', () => {
  it('should login existing user', async () => {
    // Test successful login
  });

  it('should return 401 for invalid credentials', async () => {
    // Test wrong password
  });
});
```

**Green Phase - Реализация:**
- JWT token generation
- Password hashing (bcrypt)
- Auth service

#### 3. Auth Middleware

**Red Phase - Написать тест:**
```typescript
describe('Auth Middleware', () => {
  it('should allow access with valid token', async () => {
    // Test protected route with valid JWT
  });

  it('should return 401 without token', async () => {
    // Test protected route without token
  });
});
```

**Green Phase - Реализация:**
```typescript
// src/middleware/auth.middleware.ts
```

### Чеклист Day 1-2

- [ ] Создать Supabase проект и настроить .env
- [ ] Применить Prisma миграции (npm run db:migrate)
- [ ] Написать тест для POST /auth/register
- [ ] Реализовать registration controller
- [ ] Написать тест для POST /auth/login
- [ ] Реализовать login controller + JWT
- [ ] Написать тест для auth middleware
- [ ] Реализовать auth middleware
- [ ] Написать тест для GET /auth/me
- [ ] Реализовать me endpoint
- [ ] Все тесты проходят ✅
- [ ] Coverage > 80% ✅
- [ ] Git commit: "feat: implement authentication API"

## Day 3-4: Document Upload API

### TDD для Document Upload

#### 1. Upload Document (POST /api/v1/documents)

**Red Phase - Тест:**
```typescript
describe('POST /api/v1/documents', () => {
  it('should upload document to Supabase Storage', async () => {
    const form = new FormData();
    form.append('file', fileBuffer, 'dni.pdf');
    form.append('type', 'DNI');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      headers: {
        authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      payload: form,
    });

    expect(response.statusCode).toBe(201);
    expect(body.data).toHaveProperty('fileUrl');
  });
});
```

**Green Phase - Реализация:**
```typescript
// src/services/storage.service.ts - Supabase Storage integration
// src/controllers/documents.controller.ts
// src/middleware/upload.middleware.ts
```

#### 2. List Documents (GET /api/v1/documents)

**Red Phase - Тест:**
```typescript
describe('GET /api/v1/documents', () => {
  it('should return user documents only', async () => {
    // Test row-level security
  });
});
```

### Чеклист Day 3-4

- [ ] Настроить Supabase Storage bucket
- [ ] Написать тест для upload endpoint
- [ ] Реализовать storage.service.ts
- [ ] Написать тест для list documents
- [ ] Реализовать documents.controller.ts
- [ ] Написать тест для delete document
- [ ] Реализовать DELETE endpoint
- [ ] Все тесты проходят ✅
- [ ] Git commit: "feat: implement document upload API"

## Day 5-7: Documents CRUD

- [ ] GET /api/v1/documents - список документов
- [ ] GET /api/v1/documents/:id - детали документа
- [ ] DELETE /api/v1/documents/:id - удаление
- [ ] Row-level security middleware
- [ ] Git commit: "feat: implement documents CRUD API"

## Day 8-10: AI Document Verification

### Интеграция Claude API

**Red Phase - Тест с mock:**
```typescript
describe('POST /api/v1/documents/:id/verify', () => {
  it('should verify DNI document with AI', async () => {
    // Mock Anthropic SDK response
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${documentId}/verify`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(body.data.verificationData).toHaveProperty('fullName');
    expect(body.data.verificationData).toHaveProperty('documentNumber');
  });
});
```

**Green Phase - Реализация:**
```typescript
// src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

class AIService {
  async verifyDocument(imageUrl: string, type: string) {
    // Claude Vision API integration
  }
}
```

### Чеклист Day 8-10

- [ ] Написать тест для AI verification (с mock)
- [ ] Реализовать ai.service.ts
- [ ] Интеграция с Claude Vision API
- [ ] Парсинг AI response
- [ ] Сохранение verificationData в DB
- [ ] Все тесты проходят ✅
- [ ] Git commit: "feat: implement AI document verification"

## Day 11-14: Listings CRUD

### Endpoints для листингов

- [ ] POST /api/v1/listings - создание листинга
- [ ] GET /api/v1/listings - список всех active листингов
- [ ] GET /api/v1/listings/:id - детали листинга
- [ ] GET /api/v1/owner/listings - листинги владельца
- [ ] PATCH /api/v1/listings/:id - обновление
- [ ] DELETE /api/v1/listings/:id - удаление
- [ ] Upload фото листингов (multipart)
- [ ] Git commit: "feat: implement listings CRUD API"

## Week 3-4: Applications & AI Scoring

- [ ] POST /api/v1/applications - подать заявку
- [ ] GET /api/v1/applications - список заявок
- [ ] POST /api/v1/applications/:id/score - AI скоринг
- [ ] Интеграция Claude для tenant scoring
- [ ] Git commit: "feat: implement tenant applications & AI scoring"

## Week 5-6: Contracts & Payments

- [ ] POST /api/v1/contracts - создание контракта
- [ ] GET /api/v1/contracts/:id/pdf - генерация PDF
- [ ] POST /api/v1/payments/create-intent - Stripe integration
- [ ] POST /api/v1/payments/webhook - Stripe webhooks
- [ ] Git commit: "feat: implement contracts and payments"

## Советы по TDD разработке

### 1. Always Red → Green → Refactor
- Никогда не пишите код до теста
- Пишите минимальный код для прохождения теста
- Рефакторите только после green

### 2. Один тест за раз
```bash
npm test -- auth.test.ts  # Запустить только auth тесты
```

### 3. Используйте watch mode
```bash
npm test  # Auto-rerun on changes
```

### 4. Commit часто
```bash
git add .
git commit -m "test: add registration validation tests"
# ... implement
git commit -m "feat: implement user registration"
```

### 5. Mock внешние сервисы
- Anthropic API → Mock responses
- Supabase Storage → Mock file upload
- Stripe → Mock webhooks

### 6. Coverage как metric
```bash
npm run test:coverage
# Цель: >80% coverage
```

## Полезные команды

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests in watch mode
npm run test:ui          # Visual test runner

# Database
npm run db:studio        # Open Prisma Studio
npm run db:migrate       # Create migration
npm run db:push          # Quick schema push

# Git
git status               # Check changes
git log --oneline -5     # Recent commits

# Versioning
npm run release:patch    # 1.0.0 → 1.0.1
npm run release:minor    # 1.0.0 → 1.1.0
npm run release:major    # 1.0.0 → 2.0.0
```

## Критерии готовности (Definition of Done)

Для каждой фичи:
- [ ] Тесты написаны ДО реализации
- [ ] Все тесты проходят (green)
- [ ] Coverage > 80%
- [ ] Код отформатирован (npm run format)
- [ ] Нет eslint ошибок (npm run lint)
- [ ] Git commit сделан
- [ ] README обновлен (если нужно)

## Следующий immediate шаг

**Создайте Supabase проект и начните с Authentication API (Day 1-2)**

1. Зайти на https://supabase.com и создать проект
2. Скопировать credentials в .env файл
3. Запустить `npm run db:migrate`
4. Открыть `tests/auth.test.ts` - написать первый тест
5. Запустить `npm test` - увидеть red
6. Реализовать минимальный код - сделать green
7. Refactor и commit

Успехов! 🚀
