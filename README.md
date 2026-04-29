# NoGency AI - Backend API

Backend API for a rental property management platform with AI-powered tenant scoring.

**Status:** Production-Ready | 253 tests | 86%+ coverage

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 15 (Supabase)
- **ORM:** Prisma 5.x
- **Testing:** Vitest (TDD approach)
- **AI Integration:** Anthropic Claude API (Vision + Text)
- **Income Verification:** Plaid
- **Payments:** Stripe
- **Email:** Resend
- **File Storage:** Supabase Storage
- **Authentication:** JWT + bcrypt

## Implemented APIs (Updated: 2026-02-01)

### Authentication API

| Method | Endpoint                              | Description                  |
| ------ | ------------------------------------- | ---------------------------- |
| POST   | `/api/v1/auth/register`               | User registration with JWT   |
| POST   | `/api/v1/auth/login`                  | User login with JWT          |
| GET    | `/api/v1/auth/me`                     | Get current user (protected) |
| POST   | `/api/v1/auth/verify-email`           | Verify email with token      |
| POST   | `/api/v1/auth/resend-verification`    | Resend verification email    |
| POST   | `/api/v1/auth/request-password-reset` | Request password reset link  |
| POST   | `/api/v1/auth/reset-password`         | Reset password with token    |

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

### Plaid Income Verification API

| Method | Endpoint                       | Description                      |
| ------ | ------------------------------ | -------------------------------- |
| POST   | `/api/v1/plaid/link-token`     | Create Plaid Link token          |
| POST   | `/api/v1/plaid/exchange-token` | Exchange public token for access |
| GET    | `/api/v1/plaid/income`         | Get verified income data         |
| GET    | `/api/v1/plaid/status`         | Get Plaid connection status      |
| DELETE | `/api/v1/plaid/disconnect`     | Disconnect Plaid account         |
| POST   | `/api/v1/plaid/webhook`        | Handle Plaid webhooks            |

## Project Structure

```
nogency-back/
├── src/
│   ├── routes/           # API routes
│   ├── controllers/      # Business logic
│   ├── services/         # External services (AI, Storage, Stripe, Email)
│   ├── middleware/       # Auth + Logging middleware
│   ├── schemas/          # Zod validation + Error schemas
│   ├── utils/            # Error classes, Logger, Sentry
│   ├── db/               # Prisma client
│   ├── types/            # TypeScript types
│   ├── config.ts         # Configuration
│   ├── app.ts            # Fastify app
│   └── index.ts          # Entry point
├── tests/                # Test files (253 tests)
├── prisma/               # Database schema
└── package.json
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

**Required variables:**

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
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
```

**Optional variables (monitoring):**

```env
SENTRY_DSN=https://xxx@sentry.io/xxx  # Error tracking
LOG_LEVEL=info                         # Log level
LOG_PRETTY=false                       # Pretty print in development
```

### 2.5. Git Configuration (Line Endings)

The project uses **LF (Unix-style)** line endings for all files. This ensures compatibility across Windows, Linux, and Mac.

**Automatic setup:**

The `.gitattributes` file is already configured in the repository. On first clone, run:

```bash
# Configure Git to handle line endings correctly
git config core.autocrlf input

# Re-normalize files with correct line endings
git add --renormalize .
```

**What this does:**

- `core.autocrlf input`: converts CRLF → LF on commit but does not modify files on checkout
- `.gitattributes`: ensures all text files use LF in the repository
- On Windows, Git automatically converts LF → CRLF locally, but LF is preserved in the repository

**Important:** If you see `LF will be replaced by CRLF` warnings during `git add`, run the commands above.

### 3. Database

```bash
npm run db:generate    # Generate Prisma Client
npm run db:push        # Push schema (dev)
npm run db:studio      # Open Prisma Studio
```

### 4. Running

```bash
npm run dev            # Development (port 8000)
npm run build          # Build
npm start              # Production
```

### 5. Tests

```bash
npm test               # Watch mode
npm test -- --run      # Single run
npm run test:coverage  # With coverage
```

## NPM Commands

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

- **253 tests** across 16 test files
- **86%+ overall coverage**
- All APIs fully tested

## Documentation

- [NEXT-STEPS.md](./NEXT-STEPS.md) - Development roadmap
- [CLAUDE.md](./CLAUDE.md) - Claude Code instructions

## Error Handling

The project uses a standardized error handling system:

- **Custom Error Classes** (`src/utils/errors.ts`): Specialized error classes for different HTTP status codes
  - `BadRequestError` (400)
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `UnprocessableEntityError` (422)
  - `TooManyRequestsError` (429)
  - `InternalServerError` (500)
  - `ServiceUnavailableError` (503)

- **Error Schemas** (`src/schemas/error.schema.ts`): Standardized error schemas for Swagger/OpenAPI documentation
- **Consistent Error Responses**: All errors return a unified format:
  ```json
  {
    "error": "Error message",
    "statusCode": 400,
    "code": "VALIDATION_ERROR",
    "details": {
      /* optional */
    }
  }
  ```

## Monitoring & Logging

- **Structured Logging (Pino):** JSON format for production, pretty printing for development
- **Sentry Integration:** Error tracking for 500 errors (4xx are filtered out)
- **Request ID Tracing:** Unique ID per request (x-request-id header)
- **Sensitive Data Redaction:** Automatic redaction of passwords, tokens, and API keys
- **Performance Logging:** Warnings for slow requests (>3s)
- **Service Loggers:** Dedicated loggers per module (auth, payment, email, etc.)

**Environment Variables:**

```env
SENTRY_DSN=https://xxx@sentry.io/xxx  # Error tracking (optional)
LOG_LEVEL=info                         # trace, debug, info, warn, error, fatal
LOG_PRETTY=false                       # Pretty print in development
```

## Security

- JWT authentication (7 days expiry)
- Password hashing (bcrypt, 10 rounds)
- CORS configured for frontend
- File uploads limited to 10MB
- Input validation via Zod
- SQL injection protection via Prisma
- Stripe webhook signature verification
- Plaid access tokens encrypted (AES-256-CBC)
- Standardized error handling (no sensitive data leakage)
- Rate limiting (100 req/min global, 10 req/min for auth)

## License

MIT

---

**Last Updated:** 2026-02-01
**Version:** 1.1.0
**Tests:** 253 passing

## Changelog

### 2026-02-01

- ✅ Plaid integration for income verification
- ✅ 6 new Plaid API endpoints
- ✅ AES-256-CBC encryption for Plaid access tokens
- ✅ Improved AI scoring (6 components instead of 5)
- ✅ FinancialStabilityScore added to TenantScoring
- ✅ 20 new tests for Plaid integration
- ✅ Documentation updated

### 2026-01-20

- ✅ Added structured logging (Pino)
- ✅ Sentry integration for error tracking
- ✅ Request ID tracing middleware
- ✅ Service-specific loggers
- ✅ Graceful shutdown with Sentry flush
- ✅ Documentation updated

### 2026-01-16

- ✅ Standardized error handling (custom error classes)
- ✅ Added error schemas for Swagger documentation
- ✅ Updated all controllers and routes to use standardized errors
