# Дальнейшие шаги разработки (TDD подход)

## ✅ Текущий статус проекта (Updated: 2026-01-04)

### Инфраструктура

- [x] Node.js + TypeScript ✅
- [x] Fastify framework ✅
- [x] Prisma ORM ✅
- [x] Vitest для TDD ✅
- [x] Git репозиторий ✅
- [x] ESLint (Google Style) + Prettier ✅
- [x] Git hooks (Husky + lint-staged) ✅
- [x] Структура проекта ✅
- [x] Health check endpoint ✅

### База данных

- [x] **Supabase проект создан и подключен** ✅
- [x] **Полная Prisma схема реализована (26 сущностей)** ✅
- [x] Все таблицы созданы в PostgreSQL ✅
- [x] Prisma Client сгенерирован ✅
- [x] Prisma Studio доступен (http://localhost:5556) ✅

### API Endpoints

- [x] **Authentication API полностью реализован** ✅
  - [x] POST /api/v1/auth/register (регистрация)
  - [x] POST /api/v1/auth/login (вход с JWT)
  - [x] GET /api/v1/auth/me (текущий пользователь, protected)
  - [x] Auth middleware для защиты роутов
  - [x] 10 тестов покрывают все сценарии
  - [x] Coverage: >93% для auth модулов

- [x] **Profile Management API полностью реализован** ✅
  - [x] POST /api/v1/profiles/owner (создание профиля владельца)
  - [x] POST /api/v1/profiles/tenant (создание профиля арендатора)
  - [x] GET /api/v1/profiles/me (получение профиля)
  - [x] PATCH /api/v1/profiles/me (обновление профиля)
  - [x] 18 тестов покрывают все сценарии
  - [x] Coverage: 84.42% overall (exceeds 80% target)

### Dependencies установлены

- [x] bcryptjs (password hashing)
- [x] jsonwebtoken (JWT tokens)
- [x] zod (validation schemas)
- [x] @supabase/supabase-js (Supabase client)

---

## 📊 Database Schema Overview

**26 моделей успешно созданы:**

### Core User Models

- User (auth credentials)
- UserRole (многие роли на пользователя)
- OwnerProfile (владельцы)
- TenantProfile (арендаторы)

### Property Models

- Property (недвижимость)
- PropertyPhoto (фотографии)
- PropertyDocument (документы: NOTA_SIMPLE, ESCRITURA, IBI, etc.)
- PropertyValuation (оценка стоимости)

### Listing Models

- Listing (объявления)
- ViewingSlot (слоты для показов)

### Application Models

- Application (заявки арендаторов)
- ApplicationDocument (документы заявок)
- TenantScoring (AI-скоринг арендаторов)

### Meeting & Contract Models

- Meeting (встречи, показы, подписание)
- LeaseContract (договоры аренды)
- LeaseEvent (история контракта)
- DepositRecord (депозиты)
- CommissionRecord (комиссии)
- KeyHandover (передача ключей)

### Payment Models

- Payment (все типы платежей)

### Communication Models

- Conversation (чаты)
- ConversationParticipant (участники)
- Message (сообщения)

### Notification Model

- Notification (push, sms, email, whatsapp)

---

## 🎯 Следующие шаги разработки

### Week 1-2: Owner/Tenant Profiles + Document Upload

#### Day 3-4: Profile Management API

**Endpoints для реализации:**

1. **POST /api/v1/profiles/owner** - Создать профиль владельца

   ```typescript
   // TDD: tests/profiles.test.ts
   // Schema: src/schemas/profile.schema.ts
   // Service: src/services/profile.service.ts
   // Controller: src/controllers/profile.controller.ts
   ```

2. **POST /api/v1/profiles/tenant** - Создать профиль арендатора

3. **GET /api/v1/profiles/me** - Получить свой профиль (owner или tenant)

4. **PATCH /api/v1/profiles/me** - Обновить профиль

**TDD Workflow:**

```bash
# 1. Red Phase
npm test -- profiles.test.ts --run  # Should fail

# 2. Green Phase
# Implement service, controller, routes

# 3. Verify
npm test -- profiles.test.ts --run  # Should pass
npm run test:coverage              # Check coverage >80%
```

**Acceptance Criteria:**

- [x] Тесты написаны ДО реализации ✅
- [x] POST /profiles/owner создает OwnerProfile + UserRole ✅
- [x] POST /profiles/tenant создает TenantProfile + UserRole ✅
- [x] GET /profiles/me возвращает правильный профиль ✅
- [x] Validation с Zod для всех полей ✅
- [x] Coverage > 80% (84.42%) ✅
- [x] Git commit: "feat: implement profile management API" ✅

---

#### Day 5-7: Document Upload API + Supabase Storage

**Настроить Supabase Storage:**

1. В Supabase Dashboard → Storage
2. Создать bucket "documents" (private)
3. Создать bucket "property-photos" (public)
4. Настроить RLS policies

**Endpoints для реализации:**

1. **POST /api/v1/documents** - Upload document

   ```typescript
   // Multipart file upload
   // Upload to Supabase Storage
   // Save metadata to PropertyDocument or ApplicationDocument
   ```

2. **GET /api/v1/documents** - List user documents

   ```typescript
   // Row-level security: только свои документы
   ```

3. **GET /api/v1/documents/:id** - Get document details

4. **DELETE /api/v1/documents/:id** - Delete document

**Implementation:**

```typescript
// src/services/storage.service.ts
import { createClient } from '@supabase/supabase-js';

export class StorageService {
  static async uploadFile(bucket: string, path: string, file: Buffer) {
    // Upload to Supabase Storage
  }

  static async deleteFile(bucket: string, path: string) {
    // Delete from Supabase Storage
  }

  static getPublicUrl(bucket: string, path: string) {
    // Get public URL
  }
}
```

**TDD Workflow:**

```bash
# 1. Write tests with file mocks
# tests/documents.test.ts

# 2. Implement upload logic
# src/services/storage.service.ts
# src/controllers/documents.controller.ts

# 3. Test with real Supabase
npm test -- documents.test.ts --run
```

**Acceptance Criteria:**

- [ ] Supabase Storage buckets созданы
- [ ] POST /documents загружает файл в Supabase
- [ ] GET /documents возвращает только документы пользователя
- [ ] DELETE /documents удаляет из Storage + DB
- [ ] Validation типов файлов (PDF, JPG, PNG)
- [ ] Max file size 10MB
- [ ] Coverage > 80%
- [ ] Git commit: "feat: implement document upload with Supabase Storage"

---

### Week 2: AI Document Verification (Claude Vision API)

#### Day 8-10: AI Integration

**Endpoint:**

**POST /api/v1/documents/:id/verify** - AI verification

```typescript
// src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

export class AIService {
  static async verifyDocument(documentUrl: string, documentType: string) {
    const client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: documentUrl,
              },
            },
            {
              type: 'text',
              text: `Extract information from this ${documentType} document.`,
            },
          ],
        },
      ],
    });

    // Parse and return structured data
  }
}
```

**Что извлекать из документов:**

- **DNI/NIE/TIE:**
  - Full Name
  - Document Number
  - Date of Birth
  - Expiration Date
  - Nationality

- **Payslip:**
  - Employer Name
  - Monthly Gross Income
  - Monthly Net Income
  - Employment Status

- **Bank Statement:**
  - Account Balance
  - Monthly Income
  - Transaction History

**TDD Workflow:**

```bash
# 1. Mock Claude API responses
# tests/ai.test.ts

# 2. Implement AI service
# src/services/ai.service.ts

# 3. Test with real documents
npm test -- ai.test.ts --run
```

**Acceptance Criteria:**

- [ ] POST /documents/:id/verify вызывает Claude API
- [ ] Извлекает structured data из DNI/NIE
- [ ] Сохраняет verificationData в DB
- [ ] Обновляет status документа (PENDING → VERIFIED)
- [ ] Mock тесты для AI responses
- [ ] Coverage > 80%
- [ ] Git commit: "feat: implement AI document verification with Claude"

---

### Week 3-4: Property & Listing Management

#### Property CRUD API

**Endpoints:**

1. **POST /api/v1/properties** - Create property
2. **GET /api/v1/properties** - List owner's properties
3. **GET /api/v1/properties/:id** - Get property details
4. **PATCH /api/v1/properties/:id** - Update property
5. **DELETE /api/v1/properties/:id** - Delete property
6. **POST /api/v1/properties/:id/photos** - Upload photos
7. **DELETE /api/v1/properties/:id/photos/:photoId** - Delete photo

#### Listing CRUD API

**Endpoints:**

1. **POST /api/v1/listings** - Create listing from property
2. **GET /api/v1/listings** - List active listings (public)
3. **GET /api/v1/listings/:id** - Get listing details
4. **PATCH /api/v1/listings/:id** - Update listing
5. **DELETE /api/v1/listings/:id** - Archive listing
6. **POST /api/v1/listings/:id/publish** - Publish listing
7. **POST /api/v1/listings/:id/pause** - Pause listing

**Acceptance Criteria:**

- [ ] Property CRUD полностью реализован
- [ ] Listing CRUD полностью реализован
- [ ] Owner может создать property с photos
- [ ] Property → Listing workflow
- [ ] Публичный endpoint для активных listings
- [ ] Coverage > 80%
- [ ] Git commit: "feat: implement property and listing management"

---

### Week 3-4: Tenant Applications & AI Scoring

#### Application API

**Endpoints:**

1. **POST /api/v1/applications** - Submit application
2. **GET /api/v1/applications** - List applications (filtered by role)
3. **GET /api/v1/applications/:id** - Get application details
4. **PATCH /api/v1/applications/:id/status** - Update status
5. **POST /api/v1/applications/:id/score** - Calculate AI score

**AI Scoring Logic:**

```typescript
// src/services/scoring.service.ts

export class ScoringService {
  static async calculateScore(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        tenant: true,
        documents: true,
        listing: {
          include: { preferredTenantCriteria: true },
        },
      },
    });

    // 1. Income Score (0-100)
    const incomeScore = this.calculateIncomeScore(
      application.tenant.monthlyIncome,
      application.listing.monthlyRent
    );

    // 2. Employment Score (0-100)
    const employmentScore = this.calculateEmploymentScore(
      application.tenant.occupation,
      application.documents
    );

    // 3. Rental History Score (0-100)
    // 4. Verification Score (0-100)
    // 5. Criteria Match Score (0-100)

    const totalScore =
      (incomeScore +
        employmentScore +
        rentalHistoryScore +
        verificationScore +
        criteriaMatchScore) /
      5;

    // Save to TenantScoring
    await prisma.tenantScoring.create({
      data: {
        applicationId,
        totalScore,
        incomeScore,
        employmentScore,
        rentalHistoryScore,
        verificationScore,
        criteriaMatchScore,
        riskLevel: this.calculateRiskLevel(totalScore),
        calculatedAt: new Date(),
      },
    });
  }
}
```

**Acceptance Criteria:**

- [ ] Tenant может подать заявку на listing
- [ ] Owner видит все заявки на свои listings
- [ ] AI scoring рассчитывает 5 метрик
- [ ] TenantScoring сохраняется в DB
- [ ] Risk Level определяется (LOW/MEDIUM/HIGH)
- [ ] Coverage > 80%
- [ ] Git commit: "feat: implement tenant applications and AI scoring"

---

### Week 5-6: Contracts & Payments

#### Contract API

**Endpoints:**

1. **POST /api/v1/contracts** - Create contract from application
2. **GET /api/v1/contracts/:id** - Get contract details
3. **POST /api/v1/contracts/:id/sign** - Sign contract (owner/tenant)
4. **GET /api/v1/contracts/:id/pdf** - Generate PDF contract

#### Payment API (Stripe Integration)

**Endpoints:**

1. **POST /api/v1/payments/create-intent** - Create Stripe payment intent
2. **POST /api/v1/payments/webhook** - Handle Stripe webhooks
3. **GET /api/v1/payments** - List payments for contract

**Stripe Setup:**

```typescript
// src/services/payment.service.ts
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe.secretKey);

export class PaymentService {
  static async createPaymentIntent(contractId: string, amount: number) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'eur',
      metadata: { contractId },
    });

    await prisma.payment.create({
      data: {
        contractId,
        tenantId,
        ownerId,
        type: 'DEPOSIT',
        amount,
        transactionId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return paymentIntent;
  }

  static async handleWebhook(event: Stripe.Event) {
    // Handle payment_intent.succeeded
    // Update payment status in DB
  }
}
```

**Acceptance Criteria:**

- [ ] Contract создается из approved application
- [ ] Owner и tenant могут подписать контракт
- [ ] PDF generation для контракта
- [ ] Stripe payment intent создается
- [ ] Webhook обрабатывает успешные платежи
- [ ] Payment статусы обновляются
- [ ] Coverage > 80%
- [ ] Git commit: "feat: implement contracts and payments with Stripe"

---

## 📝 TDD Checklist (для каждой фичи)

Перед началом работы над новой фичей:

- [ ] **Red Phase:** Написать failing тесты

  ```bash
  npm test -- feature.test.ts --run  # Should FAIL
  ```

- [ ] **Green Phase:** Реализовать минимальный код
  - Создать Zod schemas (validation)
  - Реализовать service (business logic)
  - Реализовать controller (HTTP handlers)
  - Создать routes
  - Зарегистрировать в app.ts

- [ ] **Verify:** Запустить тесты

  ```bash
  npm test -- feature.test.ts --run  # Should PASS
  ```

- [ ] **Refactor:** Улучшить код
  - Убрать дублирование
  - Улучшить читаемость
  - Добавить error handling

- [ ] **Coverage:** Проверить покрытие

  ```bash
  npm run test:coverage  # Should be >80%
  ```

- [ ] **Lint & Format:**

  ```bash
  npm run lint
  npm run format
  ```

- [ ] **Commit:**
  ```bash
  git add .
  git commit -m "feat: implement feature X"
  ```

---

## 🔧 Полезные команды

### Development

```bash
npm run dev              # Start dev server (port 8000)
npm test                 # Run tests in watch mode
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
```

### Database

```bash
npm run db:push          # Quick schema sync (dev)
npm run db:migrate       # Create migration (prod)
npm run db:generate      # Generate Prisma Client
npm run db:studio        # Open Prisma Studio (http://localhost:5556)
```

### Code Quality

```bash
npm run lint             # ESLint check
npm run lint -- --fix    # Auto-fix errors
npm run format           # Prettier format
```

### Git

```bash
git status
git add .
git commit -m "feat: description"
git push
```

---

## 📊 Coverage Goals

**Минимальные требования:**

- Overall: >80%
- Services: >90%
- Controllers: >85%
- Routes: 100%

**Текущий статус:**

- Overall: 84.42% ✅
- Services: 97.27% ✅
- Controllers: 72.11%
- Routes: 100% ✅

---

## 🎯 Definition of Done

Фича считается завершенной когда:

- [x] Тесты написаны ДО реализации (TDD)
- [x] Все тесты проходят (Green)
- [x] Coverage > 80%
- [x] ESLint warnings исправлены
- [x] Code отформатирован (Prettier)
- [x] Git commit создан
- [x] NEXT-STEPS.md обновлен

---

## 🚀 Quick Start для следующей фичи

**Пример: Profile Management API**

```bash
# 1. Создать файл теста
touch tests/profiles.test.ts

# 2. Написать failing тест
npm test -- profiles.test.ts --run  # RED

# 3. Создать необходимые файлы
touch src/schemas/profile.schema.ts
touch src/services/profile.service.ts
touch src/controllers/profile.controller.ts
touch src/routes/profile.routes.ts

# 4. Реализовать код
# ... implement ...

# 5. Запустить тесты
npm test -- profiles.test.ts --run  # GREEN

# 6. Проверить coverage
npm run test:coverage

# 7. Commit
git add .
git commit -m "feat: implement profile management API"
```

---

## 📚 Дополнительные ресурсы

- **Prisma Docs:** https://www.prisma.io/docs
- **Fastify Docs:** https://fastify.dev/docs
- **Vitest Docs:** https://vitest.dev
- **Zod Docs:** https://zod.dev
- **Supabase Docs:** https://supabase.com/docs
- **Anthropic Claude API:** https://docs.anthropic.com/claude/reference

---

**Last Updated:** 2026-01-04
**Next Milestone:** Document Upload API + Supabase Storage (Day 5-7)
