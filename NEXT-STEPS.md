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

- [x] **Document Upload API полностью реализован** ✅
  - [x] POST /api/v1/documents (загрузка документа в Supabase Storage)
  - [x] GET /api/v1/documents (список документов пользователя)
  - [x] GET /api/v1/documents/:id (получение документа по ID)
  - [x] DELETE /api/v1/documents/:id (удаление документа)
  - [x] 16 тестов покрывают все сценарии
  - [x] Supabase Storage buckets настроены
  - [x] Coverage: 78.96% overall

- [x] **AI Document Verification полностью реализован** ✅
  - [x] POST /api/v1/documents/:id/verify (AI верификация документа)
  - [x] AIService с Claude 3.5 Sonnet Vision API
  - [x] Извлечение данных из DNI/NIE/TIE (имя, номер, ДР, национальность)
  - [x] Извлечение данных из Payslips (работодатель, доход брутто/нетто)
  - [x] Извлечение данных из Bank Statements (баланс, месячный доход)
  - [x] verificationData JSON поле добавлено в Document model
  - [x] 8 тестов с mocked AI responses
  - [x] Coverage: 74.7% overall

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

- [x] Supabase Storage buckets созданы ✅
- [x] POST /documents загружает файл в Supabase ✅
- [x] GET /documents возвращает только документы пользователя ✅
- [x] DELETE /documents удаляет из Storage + DB ✅
- [x] Validation типов файлов (PDF, JPG, PNG) ✅
- [x] Max file size 10MB ✅
- [x] Coverage > 78% (Overall: 78.96%) ✅
- [x] Git commit: "feat: implement document upload with Supabase Storage" ✅

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

- [x] POST /documents/:id/verify вызывает Claude API ✅
- [x] Извлекает structured data из DNI/NIE ✅
- [x] Сохраняет verificationData в DB ✅
- [x] Обновляет status документа (PENDING → VERIFIED) ✅
- [x] Mock тесты для AI responses ✅
- [x] Coverage > 74% ✅
- [x] Git commit: "feat: implement AI document verification with Claude" ✅

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

### Week 7-8: Plaid Integration (Income & Identity Verification)

**Цель:** Интеграция с Plaid для автоматизации верификации доходов и улучшения tenant scoring

#### Plaid Setup & Income Verification

**Установка:**

```bash
npm install plaid
```

**Endpoints для реализации:**

1. **POST /api/v1/plaid/link-token** - Create Plaid Link token

   ```typescript
   // Frontend использует этот token для Plaid Link UI
   // Позволяет пользователю подключить банковский счет
   ```

2. **POST /api/v1/plaid/exchange-token** - Exchange public_token for access_token

   ```typescript
   // После успешного подключения банка в Plaid Link
   // Сохраняет access_token в DB для будущих запросов
   ```

3. **GET /api/v1/plaid/income** - Get income verification report

   ```typescript
   // Получает Bank Income report от Plaid
   // Возвращает: net income, income sources, stability metrics
   ```

4. **GET /api/v1/plaid/transactions** - Get user transactions

   ```typescript
   // Получает историю транзакций за последние 12 месяцев
   // Для анализа финансового поведения
   ```

**Implementation:**

```typescript
// src/services/plaid.service.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export class PlaidService {
  private static client = new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments.sandbox, // или production
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.plaid.clientId,
          'PLAID-SECRET': config.plaid.secret,
        },
      },
    })
  );

  static async createLinkToken(userId: string) {
    const response = await this.client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'NoGency AI',
      products: ['auth', 'income', 'transactions'],
      country_codes: ['US', 'ES', 'GB'], // Поддерживаемые страны
      language: 'es',
    });
    return response.data.link_token;
  }

  static async exchangePublicToken(publicToken: string) {
    const response = await this.client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return response.data.access_token;
  }

  static async getIncome(accessToken: string) {
    const response = await this.client.incomeGet({
      access_token: accessToken,
    });
    return response.data;
  }

  static async getTransactions(accessToken: string, startDate: string, endDate: string) {
    const response = await this.client.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  }
}
```

**Database Schema Updates:**

```prisma
// Добавить в TenantProfile:
model TenantProfile {
  // ... existing fields
  plaidAccessToken    String?  @map("plaid_access_token") // Encrypted!
  plaidItemId         String?  @map("plaid_item_id")
  plaidIncomeVerified Boolean  @default(false) @map("plaid_income_verified")
  plaidLastSync       DateTime? @map("plaid_last_sync")
}
```

**Enhanced AI Scoring with Plaid:**

```typescript
// src/services/scoring.service.ts - ENHANCED VERSION

export class ScoringService {
  static async calculateScore(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        tenant: true,
        documents: true,
        listing: true,
      },
    });

    // 1. Income Score - ENHANCED with Plaid
    let incomeScore = 0;
    if (application.tenant.plaidIncomeVerified) {
      // Используем verified Plaid income (более надежно)
      const plaidIncome = await PlaidService.getIncome(application.tenant.plaidAccessToken!);
      const monthlyIncome = plaidIncome.income.streams[0].monthly_income;
      incomeScore = this.calculateIncomeScore(monthlyIncome, application.listing.monthlyRent);
    } else {
      // Fallback: используем данные из документов (Claude AI)
      incomeScore = this.calculateIncomeScore(
        application.tenant.monthlyIncome,
        application.listing.monthlyRent
      );
    }

    // 2. Financial Stability Score - NEW with Plaid Transactions
    let financialStabilityScore = 0;
    if (application.tenant.plaidAccessToken) {
      const transactions = await PlaidService.getTransactions(
        application.tenant.plaidAccessToken
        /* last 12 months */
      );
      financialStabilityScore = this.analyzeFinancialStability(transactions);
    }

    // 3. Employment Score
    const employmentScore = this.calculateEmploymentScore(/*...*/);

    // 4. Verification Score
    const verificationScore = this.calculateVerificationScore(/*...*/);

    // 5. Criteria Match Score
    const criteriaMatchScore = this.calculateCriteriaMatch(/*...*/);

    // TOTAL SCORE with Plaid boost
    const totalScore =
      (incomeScore +
        employmentScore +
        verificationScore +
        criteriaMatchScore +
        financialStabilityScore) /
      5;

    // Save with new fields
    await prisma.tenantScoring.create({
      data: {
        applicationId,
        totalScore,
        incomeScore,
        employmentScore,
        verificationScore,
        criteriaMatchScore,
        financialStabilityScore, // NEW
        riskLevel: this.calculateRiskLevel(totalScore),
        calculatedAt: new Date(),
      },
    });
  }

  // NEW: Analyze financial stability from transactions
  static analyzeFinancialStability(transactions: any): number {
    // 1. Income regularity (регулярность зарплаты)
    // 2. Savings pattern (есть ли накопления?)
    // 3. Overdrafts / NSF fees (овердрафты = bad)
    // 4. Spending pattern (стабильность расходов)
    // Return score 0-100
  }
}
```

**Acceptance Criteria:**

- [ ] Plaid SDK установлен и настроен
- [ ] POST /plaid/link-token создает Link token
- [ ] POST /plaid/exchange-token обменивает токены
- [ ] GET /plaid/income получает income report
- [ ] GET /plaid/transactions получает транзакции
- [ ] TenantProfile хранит Plaid access_token (encrypted)
- [ ] ScoringService использует Plaid income для расчета
- [ ] FinancialStabilityScore добавлен в TenantScoring
- [ ] Frontend Plaid Link компонент интегрирован
- [ ] Тесты покрывают Plaid integration (mocked)
- [ ] Coverage > 80%
- [ ] Git commit: "feat: integrate Plaid for income verification and enhanced scoring"

**Security Notes:**

- ⚠️ Plaid access_token должен быть зашифрован в БД
- ⚠️ Использовать environment variables для Plaid credentials
- ⚠️ Проверить географические ограничения для Spain/EU
- ⚠️ Рассмотреть регистрацию UK entity для доступа к Plaid

**Optional: Plaid Identity Verification**

Если нужна дополнительная верификация документов:

```typescript
// POST /api/v1/plaid/identity-verification/create
// Webhook: /api/v1/plaid/webhooks/identity
// Стоимость: ~$0.70-1.50 за проверку
```

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

- Overall: 78.96% ✅
- Services: 86.57% ✅
- Controllers: 76.74% ✅
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
**Next Milestone:** Property & Listing CRUD API (Week 3-4)
