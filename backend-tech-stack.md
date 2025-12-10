# NoGency AI - Backend Tech Stack
## Рекомендации для MVP (6 недель)

---

## 🎯 Анализ требований

### Критические функции бэкенда:
1. **Аутентификация** - регистрация владельцев и арендаторов
2. **Файловое хранилище** - загрузка документов (DNI, фото квартир)
3. **AI-интеграция** - верификация документов, скоринг арендаторов
4. **CRUD для листингов** - управление объявлениями недвижимости
5. **Обработка заявок** - форма арендаторов, хранение данных
6. **Генерация PDF** - договоры аренды
7. **Платежи** - интеграция Stripe
8. **Email notifications** - уведомления о новых заявках
9. **API для календаря** - интеграция Cal.com/Calendly

### Нефункциональные требования:
- ⚡ **Скорость разработки** - критично (MVP за 6 недель)
- 🔒 **Безопасность** - GDPR, encrypted storage
- 📈 **Масштабируемость** - начать с малого, легко расти
- 💰 **Стоимость** - минимальные затраты на инфраструктуру
- 🛠️ **Developer Experience** - быстрая итерация, простой deploy

---

## ✅ Технологический стек: Node.js + TypeScript

**Почему выбран этот стек:**
1. ⚡ Оптимален для 6-недельного MVP
2. 🎯 Отличная интеграция с Supabase (официальный SDK)
3. 💰 Низкая стоимость хостинга (~$5/мес)
4. 🔄 Один язык на всём стеке с frontend (TypeScript)
5. 📦 Огромная экосистема npm пакетов
6. 🚀 Быстрый deploy и холодный старт (<100ms)

---

## 🏗️ Выбранный стек

### 🏗️ Core Backend Stack

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| **Backend Framework** | **Express.js** или **Fastify** | ✅ Express: самый популярный, огромная экосистема<br>✅ Fastify: быстрее, TypeScript first, лучший DX<br>✅ Оба: зрелые, production-ready |
| **Language** | **TypeScript 5+** | ✅ Type safety<br>✅ Better IDE support<br>✅ Меньше runtime ошибок<br>✅ Единый язык с frontend |
| **Database** | **Supabase (PostgreSQL 15)** | ✅ Auth + DB + Storage в одном<br>✅ Официальный JS SDK<br>✅ Row-level security (RLS)<br>✅ Real-time subscriptions<br>✅ Hosted, не нужен DevOps |
| **ORM/Query Builder** | **Prisma** или **Drizzle ORM** | ✅ Prisma: лучший DX, type-safe queries<br>✅ Drizzle: легче, ближе к SQL<br>✅ Оба: отличная TS поддержка, миграции |
| **File Storage** | **Supabase Storage** | ✅ S3-compatible<br>✅ Encrypted at rest<br>✅ GDPR compliance<br>✅ CDN included<br>✅ Signed URLs для приватных файлов |
| **Authentication** | **Supabase Auth** | ✅ JWT токены<br>✅ Email/password + OAuth<br>✅ Magic links<br>✅ Row-level security интеграция<br>✅ Не нужно писать с нуля |

### 🤖 AI & Integrations

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| **AI Provider** | **Anthropic Claude API (3.5 Sonnet)** | ✅ Лучший для document analysis<br>✅ Vision API для фото DNI<br>✅ Structured outputs<br>✅ 200K context window<br>✅ Официальный TypeScript SDK |
| **PDF Generation** | **PDFKit** или **Puppeteer** | ✅ PDFKit: native Node.js, быстрый<br>✅ Puppeteer: HTML → PDF (проще дизайн) |
| **Email** | **Resend** или **SendGrid** | ✅ Resend: современный, отличный DX, TS SDK<br>✅ SendGrid: проверенный, 100 emails/day free |
| **Payments** | **Stripe (Node SDK)** | ✅ Уже используется в autonomo<br>✅ Отличный TypeScript support<br>✅ Webhooks для автоматизации |
| **Calendar** | **Cal.com (Embed)** | ✅ Open source<br>✅ Бесплатный hosted tier<br>✅ Embed в iframe<br>✅ API для кастомизации |
| **Validation** | **Zod** | ✅ Runtime + compile-time validation<br>✅ Отличная TypeScript интеграция<br>✅ Schema-first approach |

### 🚀 Infrastructure & DevOps

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| **Hosting** | **Railway.app** или **Render.com** | ✅ Railway: $5/месяц, отличный DX<br>✅ Render: бесплатный tier, auto-deploy<br>✅ Оба: git push = deploy |
| **Environment** | **Docker + docker-compose** | ✅ Consistency dev/prod<br>✅ Легко добавлять сервисы<br>✅ Одна команда для старта |
| **Task Queue** | **BullMQ + Redis** (если нужно) | ✅ Для async задач (PDF, AI calls)<br>✅ Не обязательно в Week 1-2 |
| **Monitoring** | **Sentry** (free tier) | ✅ Error tracking<br>✅ Performance monitoring<br>✅ 5K events/месяц бесплатно |
| **Process Manager** | **PM2** (production) | ✅ Auto-restart<br>✅ Clustering<br>✅ Logs management |

### 📦 Key Dependencies (package.json)

```json
{
  "name": "nogency-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push"
  },
  "dependencies": {
    // Web Framework (выбрать один)
    "express": "^4.18.2",
    "@types/express": "^4.17.21",
    // OR
    "fastify": "^4.26.0",
    "@fastify/cors": "^8.5.0",
    "@fastify/multipart": "^8.1.0",

    // Database & ORM
    "@supabase/supabase-js": "^2.39.7",
    "prisma": "^5.9.1",
    "@prisma/client": "^5.9.1",
    // OR
    "drizzle-orm": "^0.29.3",
    "drizzle-kit": "^0.20.13",

    // AI Integration
    "@anthropic-ai/sdk": "^0.18.0",

    // Payments
    "stripe": "^14.14.0",

    // PDF Generation
    "pdfkit": "^0.14.0",
    // OR
    "puppeteer": "^21.9.0",

    // Email
    "resend": "^3.2.0",
    // OR
    "@sendgrid/mail": "^8.1.0",

    // Validation
    "zod": "^3.22.4",

    // Utilities
    "dotenv": "^16.4.1",
    "date-fns": "^3.3.1",
    "nanoid": "^5.0.5"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.16",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.20.0",
    "@typescript-eslint/parser": "^6.20.0",
    "prettier": "^3.2.4",
    "vitest": "^1.2.2"
  }
}
```

### 🏗️ Структура проекта

```
nogency-back/
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Express/Fastify app setup
│   ├── config.ts                # Configuration (env vars)
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── auth.routes.ts       # Auth endpoints
│   │   ├── documents.routes.ts  # Document upload/verification
│   │   ├── listings.routes.ts   # Listings CRUD
│   │   ├── applications.routes.ts
│   │   ├── contracts.routes.ts
│   │   └── payments.routes.ts   # Stripe webhooks
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── documents.controller.ts
│   │   ├── listings.controller.ts
│   │   ├── applications.controller.ts
│   │   ├── contracts.controller.ts
│   │   └── payments.controller.ts
│   │
│   ├── services/
│   │   ├── ai.service.ts         # Claude API integration
│   │   ├── document.service.ts   # Document verification
│   │   ├── scoring.service.ts    # AI scoring
│   │   ├── contract.service.ts   # PDF generation
│   │   ├── payment.service.ts    # Stripe
│   │   ├── email.service.ts      # Resend/SendGrid
│   │   └── storage.service.ts    # Supabase Storage
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── error.middleware.ts   # Error handling
│   │   ├── validation.middleware.ts
│   │   └── upload.middleware.ts  # File upload
│   │
│   ├── db/
│   │   ├── client.ts            # Supabase client
│   │   └── schema.prisma        # Prisma schema
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── user.types.ts
│   │   ├── listing.types.ts
│   │   ├── application.types.ts
│   │   └── document.types.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── validators.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── auth.test.ts
│   └── listings.test.ts
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .env
├── tsconfig.json
├── package.json
└── README.md
```

### 🔧 TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 💾 Prisma Schema Example

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profile {
  id        String   @id @default(uuid())
  role      Role     @default(TENANT)
  fullName  String?  @map("full_name")
  phone     String?
  email     String   @unique
  verified  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  documents    Document[]
  listings     Listing[]
  applications Application[]
  ownedContracts   Contract[] @relation("OwnerContracts")
  tenantContracts  Contract[] @relation("TenantContracts")
  payments     Payment[]

  @@map("profiles")
}

enum Role {
  OWNER
  TENANT
  ADMIN
}

model Document {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  type             String
  fileUrl          String   @map("file_url")
  fileName         String?  @map("file_name")
  verified         Boolean  @default(false)
  verificationData Json?    @map("verification_data")
  uploadedAt       DateTime @default(now()) @map("uploaded_at")

  user Profile @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("documents")
}

model Listing {
  id           String    @id @default(uuid())
  ownerId      String    @map("owner_id")
  title        String
  description  String?
  address      String
  city         String?
  postalCode   String?   @map("postal_code")
  priceMonthly Decimal   @map("price_monthly") @db.Decimal(10, 2)
  bedrooms     Int?
  bathrooms    Int?
  squareMeters Int?      @map("square_meters")
  status       ListingStatus @default(DRAFT)
  publishedAt  DateTime? @map("published_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  owner        Profile @relation(fields: [ownerId], references: [id])
  photos       ListingPhoto[]
  applications Application[]
  contracts    Contract[]

  @@index([ownerId])
  @@index([status])
  @@map("listings")
}

enum ListingStatus {
  DRAFT
  ACTIVE
  RENTED
  INACTIVE
}

model ListingPhoto {
  id         String   @id @default(uuid())
  listingId  String   @map("listing_id")
  fileUrl    String   @map("file_url")
  isPrimary  Boolean  @default(false) @map("is_primary")
  orderIndex Int?     @map("order_index")
  uploadedAt DateTime @default(now()) @map("uploaded_at")

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@map("listing_photos")
}

model Application {
  id               String      @id @default(uuid())
  listingId        String      @map("listing_id")
  tenantId         String      @map("tenant_id")
  status           ApplicationStatus @default(PENDING)
  employmentStatus String?     @map("employment_status")
  monthlyIncome    Decimal?    @map("monthly_income") @db.Decimal(10, 2)
  moveInDate       DateTime?   @map("move_in_date") @db.Date
  message          String?
  aiScore          Int?        @map("ai_score")
  aiReasoning      String?     @map("ai_reasoning")
  scoredAt         DateTime?   @map("scored_at")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")

  listing   Listing @relation(fields: [listingId], references: [id])
  tenant    Profile @relation(fields: [tenantId], references: [id])
  contracts Contract[]

  @@index([listingId])
  @@index([tenantId])
  @@index([status])
  @@map("applications")
}

enum ApplicationStatus {
  PENDING
  REVIEWED
  APPROVED
  REJECTED
}

model Contract {
  id              String    @id @default(uuid())
  applicationId   String    @map("application_id")
  listingId       String    @map("listing_id")
  ownerId         String    @map("owner_id")
  tenantId        String    @map("tenant_id")
  contractPdfUrl  String?   @map("contract_pdf_url")
  signedByOwner   Boolean   @default(false) @map("signed_by_owner")
  signedByTenant  Boolean   @default(false) @map("signed_by_tenant")
  startDate       DateTime  @map("start_date") @db.Date
  endDate         DateTime  @map("end_date") @db.Date
  monthlyRent     Decimal   @map("monthly_rent") @db.Decimal(10, 2)
  deposit         Decimal?  @db.Decimal(10, 2)
  createdAt       DateTime  @default(now()) @map("created_at")
  signedAt        DateTime? @map("signed_at")

  application Application @relation(fields: [applicationId], references: [id])
  listing     Listing     @relation(fields: [listingId], references: [id])
  owner       Profile     @relation("OwnerContracts", fields: [ownerId], references: [id])
  tenant      Profile     @relation("TenantContracts", fields: [tenantId], references: [id])
  payments    Payment[]

  @@index([applicationId])
  @@map("contracts")
}

model Payment {
  id                      String    @id @default(uuid())
  contractId              String?   @map("contract_id")
  tenantId                String    @map("tenant_id")
  stripePaymentIntentId   String?   @unique @map("stripe_payment_intent_id")
  amount                  Decimal   @db.Decimal(10, 2)
  status                  String?
  type                    String?
  createdAt               DateTime  @default(now()) @map("created_at")
  paidAt                  DateTime? @map("paid_at")

  contract Contract? @relation(fields: [contractId], references: [id])
  tenant   Profile   @relation(fields: [tenantId], references: [id])

  @@map("payments")
}
```

### 🔄 API Example (Express + TypeScript)

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/v1', routes);

  // Error handling
  app.use(errorMiddleware);

  return app;
};
```

```typescript
// src/controllers/documents.controller.ts
import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';
import { storageService } from '../services/storage.service';
import { aiService } from '../services/ai.service';

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id; // From auth middleware
    const file = req.file;
    const { type } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Supabase Storage
    const fileUrl = await storageService.uploadFile(
      `documents/${userId}/${file.originalname}`,
      file.buffer
    );

    // Save metadata to database
    const document = await documentService.createDocument({
      userId,
      type,
      fileUrl,
      fileName: file.originalname,
    });

    res.status(201).json({ data: document });
  } catch (error) {
    next(error);
  }
};

export const verifyDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get document
    const document = await documentService.getDocument(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify with AI
    const verificationData = await aiService.verifyDocument(
      document.fileUrl,
      document.type
    );

    // Update document
    const updated = await documentService.updateDocument(id, {
      verified: true,
      verificationData,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};
```

```typescript
// src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

class AIService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async verifyDocument(imageUrl: string, documentType: string) {
    const imageData = await this.downloadImage(imageUrl);

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Analyze this ${documentType} document and extract:
                - Full Name
                - Document Number
                - Date of Birth
                - Expiry Date
                - Nationality

                Return as JSON. If any field is unclear, set to null.
                Also verify if this appears to be a legitimate document.`,
            },
          ],
        },
      ],
    });

    return this.parseResponse(message);
  }

  async scoreTenantApplication(applicationData: any, documents: any[]) {
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are an expert property manager. Score this tenant application from 1-100.

Application Details:
- Monthly Income: €${applicationData.monthlyIncome}
- Rent: €${applicationData.listingPrice}
- Employment: ${applicationData.employmentStatus}
- Documents Verified: ${documents.filter((d) => d.verified).length}

Provide:
1. Score (1-100)
2. Reasoning (2-3 sentences)
3. Red flags (if any)
4. Green flags (if any)

Return as JSON.`,
        },
      ],
    });

    return this.parseResponse(message);
  }

  private async downloadImage(url: string): Promise<string> {
    // Implementation
    return '';
  }

  private parseResponse(message: any) {
    // Parse Claude response
    return {};
  }
}

export const aiService = new AIService();
```

### 🐳 Docker Setup

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 8000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '8000:8000'
    env_file:
      - .env
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

### 🎯 Week 1-2 Priorities (Node.js + TypeScript)

#### Day 1-2: Setup
- [ ] Создать Supabase проект
- [ ] Инициализировать Node.js + TypeScript проект
- [ ] Установить Express/Fastify + dependencies
- [ ] Настроить Prisma + Supabase connection
- [ ] Endpoints: `POST /auth/register`, `POST /auth/login`
- [ ] **Test:** Можно зарегистрироваться и получить JWT token

#### Day 3-4: Document Upload
- [ ] Настроить Supabase Storage buckets
- [ ] Middleware для file upload (multer)
- [ ] Endpoint: `POST /documents` (upload file)
- [ ] Сохранение metadata в DB через Prisma
- [ ] **Test:** Можно загрузить PDF файл

#### Day 5-7: Documents API
- [ ] `GET /documents` - список документов пользователя
- [ ] `GET /documents/{id}` - детали документа
- [ ] `DELETE /documents/{id}` - удалить документ
- [ ] Row-level security через middleware
- [ ] **Test:** API работает, пользователь видит только свои документы

#### Day 8-10: AI Document Verification
- [ ] Интеграция Anthropic SDK (@anthropic-ai/sdk)
- [ ] `POST /documents/{id}/verify` - верификация через AI
- [ ] Парсинг ответа, сохранение в `verificationData`
- [ ] **Test:** Upload DNI → получить extracted name, number, DOB

#### Day 11-14: Owner Data API
- [ ] Prisma models для Listings
- [ ] Basic CRUD controllers
- [ ] `GET /owner/listings` - листинги владельца
- [ ] `POST /listings` - создать листинг
- [ ] **Test:** Владелец может создать листинг и видеть его

---

## 📋 Database Schema (PostgreSQL)

Database schema для Prisma ORM:

---

## 🔄 API Endpoints

### Week 1-2
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/{id}`
- `POST /api/v1/documents/{id}/verify`
- `DELETE /api/v1/documents/{id}`
- `POST /api/v1/listings`
- `GET /api/v1/listings`
- `GET /api/v1/owner/listings`

### Week 3-4
- `POST /api/v1/applications`
- `GET /api/v1/applications`
- `POST /api/v1/applications/{id}/score`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts/{id}/pdf`

### Week 5-6
- `POST /api/v1/payments/create-intent`
- `POST /api/v1/payments/webhook`

---

## 🚀 Deployment & Environment

### Environment Variables (.env)

```bash
# App
NODE_ENV=development
PORT=8000

# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=re_xxx

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Sentry (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 💡 Final Recommendations

### Преимущества выбранного стека:

1. ⚡ Быстрая разработка (меньше boilerplate)
2. 🎯 Отличная интеграция с Supabase
3. 💰 Низкая стоимость хостинга (~$5-10/мес)
4. 🔄 Один язык на всём стеке (TypeScript)
5. 🚀 Быстрый deploy и короткие циклы итераций

### Что НЕ делать в MVP:
- ❌ Микросервисы
- ❌ GraphQL (пока REST достаточно)
- ❌ Сложная кеш-стратегия
- ❌ WebSockets (пока не нужны)
- ❌ Over-engineering

### Must-have с Day 1:
- ✅ TypeScript strict mode
- ✅ Environment variables
- ✅ Error handling middleware
- ✅ Input validation (Zod/class-validator)
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Git commits часто, small PRs

---

## 📞 Questions to Discuss

1. **Experience:** Есть ли опыт с Node.js/TypeScript?
2. **Time commitment:** Сколько часов в неделю реально?
3. **DevOps:** Знаком с Docker? Railway/Render?
4. **Team alignment:** Яша будет использовать Next.js (TypeScript) на frontend?
5. **AI Integration:** Опыт с LLM APIs (Claude, OpenAI)?

---

**Версия:** 2.0 (Node.js + TypeScript)
**Дата:** 2025-12-09
**Автор:** Claude (prepared for Стас)
