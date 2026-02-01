# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoGency AI is a backend API for a rental property management platform with AI-powered tenant screening. Built with Fastify, TypeScript, and PostgreSQL (via Supabase), using Anthropic Claude for AI verification and Stripe for payments.

**Tech Stack:** Node.js 20+, TypeScript 5+, Fastify 4.x, Prisma 5.x, PostgreSQL 15, Vitest

**Current Status:** Production-ready with 253 tests, 86%+ coverage

## Essential Commands

### Development

```bash
npm run dev              # Start dev server with hot-reload (port 8000)
npm run build            # TypeScript compilation to dist/
npm start                # Run production build
```

### Testing (TDD Workflow)

```bash
npm test                 # Run tests in watch mode (default for TDD)
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
```

### Database (Prisma)

```bash
npm run db:generate      # Generate Prisma Client after schema changes
npm run db:migrate       # Create and apply migrations (prod)
npm run db:push          # Fast schema push (dev only, no migrations)
npm run db:studio        # Open Prisma Studio GUI
```

### Code Quality

```bash
npm run lint             # ESLint check (Google Style Guide)
npm run lint -- --fix    # Auto-fix ESLint errors
npm run format           # Format with Prettier
```

## Git Workflow & Hooks

**Branch Strategy:**

- `master` - Production (requires all tests passing, full lint, build)
- `dev` - Main development branch (current)
- `feature/*` - Optional feature branches

**Git Hooks (Husky):**

- **pre-commit:** Runs on all branches. ESLint + Prettier on staged files via lint-staged. Commit blocked if errors.
- **pre-push:** Runs ONLY on master branch. Full lint + test:coverage + build. Push blocked if any fail.

**Important:** Dev branch has no pre-push hook for faster development. Only master enforces full checks.

## Code Style (Enforced)

**ESLint Config:** Google Style Guide + TypeScript

- Indent: 2 spaces
- Max line length: 100 chars
- Object spacing: `{ foo: 'bar' }` (with spaces)
- Trailing commas: Yes (multiline)
- Single quotes: Yes
- Semicolons: Required

**Key TypeScript Rules:**

- `@typescript-eslint/no-explicit-any`: warn (use sparingly)
- `@typescript-eslint/no-unused-vars`: error (prefix with `_` to ignore)
- Arrow functions require parens: `(x) => x`

## Architecture

### Fastify Application Structure

**Entry Point:** `src/index.ts` → `src/app.ts` (createApp factory)

**App Setup (`src/app.ts`):**

- CORS configured for frontend URL
- Multipart plugin for file uploads (10MB limit)
- Routes registered with `/api/v1` prefix
- Structured logging with Pino (JSON in prod, pretty in dev)
- Sentry integration for error tracking
- Rate limiting: 100 req/min global, 10 req/min for auth (disabled in test)

**Config:** `src/config.ts` - Centralized configuration from environment variables

**Project Structure:**

```
src/
├── routes/          # Fastify route handlers
├── controllers/     # Business logic layer
├── services/        # External services (AI, Storage, Stripe)
├── middleware/      # Auth middleware
├── schemas/         # Zod validation schemas + Error schemas
├── db/              # Prisma client singleton
├── types/           # Shared TypeScript types
└── utils/           # Error classes + Helper functions
```

### Implemented APIs

All APIs are fully implemented with tests:

1. **Auth API** (`/api/v1/auth`) - Registration, login, JWT tokens
2. **Profile API** (`/api/v1/profiles`) - Owner/tenant profiles
3. **Documents API** (`/api/v1/documents`) - Upload, AI verification (Claude Vision)
4. **Properties API** (`/api/v1/properties`) - Property CRUD
5. **Listings API** (`/api/v1/listings`) - Listing management, publish/unpublish
6. **Applications API** (`/api/v1/applications`) - Applications with AI scoring
7. **Contracts API** (`/api/v1/contracts`) - Contract lifecycle, signing
8. **Payments API** (`/api/v1/payments`) - Stripe integration, webhooks
9. **Plaid API** (`/api/v1/plaid`) - Income verification via Plaid, enhanced scoring

### Database Schema (Prisma)

**Core Models:**

- `User`, `UserRole` - Authentication
- `OwnerProfile`, `TenantProfile` - User profiles
- `Document` - Uploaded documents with AI verification
- `Property`, `PropertyPhoto` - Properties
- `Listing`, `ViewingSlot` - Listings
- `Application`, `TenantScoring` - Applications with AI scores
- `LeaseContract`, `LeaseEvent` - Contracts
- `Payment`, `DepositRecord` - Payments

**Key Patterns:**

- All IDs use UUID (`@default(uuid())`)
- Timestamps: `createdAt`, `updatedAt` (`@updatedAt`)
- Snake_case in DB (`@map`), camelCase in code
- Relations use onDelete: Cascade where appropriate

**After Schema Changes:**

```bash
npm run db:generate  # ALWAYS run this after editing schema.prisma
npm run db:migrate   # Create migration for production
```

## Testing Strategy (TDD)

**Framework:** Vitest with globals enabled

**Test Structure:**

- Tests in `tests/` directory
- File naming: `*.test.ts`
- Setup file: `tests/setup.ts`
- 253 tests across 16 files
- Coverage: 86%+

**TDD Cycle:**

1. Write failing test (Red)
2. Write minimal code to pass (Green)
3. Refactor without breaking tests
4. Run `npm test` in watch mode continuously

**Testing Fastify Routes:**

```typescript
const response = await app.inject({
  method: 'GET',
  url: '/api/v1/endpoint',
});
```

Use `app.inject()` for route testing (no HTTP server needed).

## Environment Setup

**Required Variables (`.env`):**

```
DATABASE_URL              # Supabase PostgreSQL connection
SUPABASE_URL              # Supabase project URL
SUPABASE_ANON_KEY         # Public anon key
SUPABASE_SERVICE_KEY      # Service role key (admin)
JWT_SECRET                # Secret for JWT signing
ANTHROPIC_API_KEY         # Claude API key
STRIPE_SECRET_KEY         # Stripe secret
STRIPE_WEBHOOK_SECRET     # Stripe webhook secret
RESEND_API_KEY            # Email service
FRONTEND_URL              # CORS allowed origin
PLAID_CLIENT_ID           # Plaid client ID
PLAID_SECRET              # Plaid secret key
PLAID_ENV                 # Plaid environment (sandbox/development/production)
PLAID_WEBHOOK_URL         # Plaid webhook URL (optional)
```

Copy `.env.example` to `.env` and fill in values.

**Git Configuration (Line Endings):**

Project uses LF (Unix-style) line endings. On first clone, configure Git:

```bash
git config core.autocrlf input
git add --renormalize .
```

The `.gitattributes` file ensures all text files use LF in the repository for cross-platform compatibility.

## Development Workflow

1. **Always work in `dev` branch** unless creating feature branch
2. **Run tests in watch mode** during development (`npm test`)
3. **Commit frequently** with conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `test:` - Adding tests
   - `refactor:` - Code refactoring
   - `docs:` - Documentation
   - `chore:` - Dependencies, configs
4. **Pre-commit hook auto-fixes** most lint/format issues
5. **Merge to master** only when feature complete, tested, documented

## Common Patterns

**Fastify Route Registration:**

```typescript
export default async function routes(app: FastifyInstance) {
  app.get('/endpoint', { preHandler: authMiddleware }, async (request, reply) => {
    return { data: 'value' };
  });
}
```

**Prisma Client Usage:**

```typescript
import { prisma } from './db/client.js';

const user = await prisma.user.findUnique({
  where: { id: userId },
});
```

**Config Access:**

```typescript
import { config } from './config.js';

const apiKey = config.anthropic.apiKey;
```

**Error Handling (Standardized):**

Проект использует стандартизированные классы ошибок из `src/utils/errors.ts`:

```typescript
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';

// Throw errors in controllers - они автоматически обрабатываются middleware
if (!resource) {
  throw new NotFoundError('Resource not found');
}

// Validation errors with details
if (!parseResult.success) {
  throw new ValidationError('Validation failed', {
    email: ['Invalid email format'],
    password: ['Password must be at least 8 characters'],
  });
}

// Unauthorized access
if (!user) {
  throw new UnauthorizedError('Authentication required');
}
```

**Available Error Classes:**

- `BadRequestError` (400) - Invalid request data
- `ValidationError` (400) - Schema validation failed (with details)
- `UnauthorizedError` (401) - Authentication required/failed
- `ForbiddenError` (403) - Access denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict (duplicate)
- `UnprocessableEntityError` (422) - Semantic validation failed
- `TooManyRequestsError` (429) - Rate limit exceeded
- `InternalServerError` (500) - Unexpected server error
- `ServiceUnavailableError` (503) - Service temporarily unavailable

**Error Response Format:**
Все ошибки автоматически преобразуются в единый формат:

```json
{
  "error": "Error message",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "details": {
    /* optional field errors */
  }
}
```

**Error Schemas for Swagger:**
Используйте `errorResponseSchema` из `src/schemas/error.schema.ts` в роутах для каждого статуса ошибки:

```typescript
import { errorResponseSchema } from '../schemas/error.schema.js';

app.get(
  '/endpoint',
  {
    schema: {
      response: {
        200: {
          /* success schema */
        },
        400: {
          description: 'Validation error',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Validation failed',
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              details: { fields: ['email: Invalid email format'] },
            },
          ],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
          examples: [
            {
              error: 'No token provided',
              statusCode: 401,
              code: 'UNAUTHORIZED',
            },
          ],
        },
        404: {
          description: 'Resource not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Resource not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
  },
  handler
);
```

**Примечание:** `commonErrorResponses` определен в `error.schema.ts`, но в проекте используется паттерн с явным указанием каждого статуса ошибки с `errorResponseSchema` для большей гибкости и явности.

**Zod Validation (with Error Classes):**

```typescript
import { ValidationError } from '../utils/errors.js';

const parseResult = schema.safeParse(request.body);
if (!parseResult.success) {
  throw new ValidationError('Validation failed', parseResult.error.flatten().fieldErrors);
}
// Если валидация прошла, используем parseResult.data
```

**Logging (Structured):**

Проект использует структурированное логирование через `src/utils/logger.ts`:

```typescript
import { logger, serviceLoggers } from '../utils/logger.js';

// Main logger
logger.info({ port: 8000, environment: 'production' }, 'Server started');

// Service-specific loggers (recommended)
serviceLoggers.auth.info({ userId: user.id }, 'User logged in');
serviceLoggers.payment.error({ error, paymentId }, 'Payment failed');
serviceLoggers.email.debug({ to, subject }, 'Email sent');
```

**Available Service Loggers:**

- `serviceLoggers.auth` - Authentication operations
- `serviceLoggers.documents` - Document operations
- `serviceLoggers.ai` - AI/Claude operations
- `serviceLoggers.storage` - Supabase Storage
- `serviceLoggers.payment` - Stripe payments
- `serviceLoggers.email` - Email sending
- `serviceLoggers.scoring` - Tenant scoring
- `serviceLoggers.contract` - Contract operations
- `serviceLoggers.application` - Applications
- `serviceLoggers.listing` - Listings
- `serviceLoggers.property` - Properties
- `serviceLoggers.profile` - Profiles
- `serviceLoggers.health` - Health checks
- `serviceLoggers.plaid` - Plaid income verification

**Log Levels:** `trace`, `debug`, `info`, `warn`, `error`, `fatal`

**Sensitive Data:** Automatically redacted (passwords, tokens, API keys, etc.)

**Sentry Integration (`src/utils/sentry.ts`):**

```typescript
import { captureException, setUser } from '../utils/sentry.js';

// Capture unexpected errors
captureException(error, { userId, operation: 'payment' });

// Set user context for debugging
setUser({ id: user.id, email: user.email, role: 'OWNER' });
```

## Important Notes

### Dual Validation System (Zod + JSON Schema)

**CRITICAL:** This project uses TWO validation systems that MUST stay synchronized:

1. **Zod schemas** (`src/schemas/*.ts`) - Runtime validation in controllers
2. **JSON Schema** (in `src/routes/*.ts`) - Fastify validation + Swagger/OpenAPI docs

**When adding/modifying API endpoints:**

1. **Always run tests BEFORE and AFTER changes** - `npm test -- --run`
2. **JSON Schema in routes must match Zod schema** - same required fields, same enums, same types
3. **Response type matters:**
   - Endpoints returning arrays: use `type: 'array'` with `items: { type: 'object', additionalProperties: true }`
   - Endpoints returning objects: use `type: 'object'` with `additionalProperties: true`
4. **Multipart endpoints** (file uploads): do NOT add `body` JSON Schema - validation is handled by controller
5. **Fastify validates body BEFORE auth middleware** - so invalid body returns 400, not 401

**Example of synchronized schemas:**

```typescript
// src/schemas/property.schema.ts (Zod)
export const createPropertySchema = z.object({
  address: addressSchema,  // nested object
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM']),
  totalArea: z.number().positive(),
  roomCount: z.number().int().positive(),
});

// src/routes/property.routes.ts (JSON Schema)
body: {
  type: 'object',
  required: ['address', 'propertyType', 'totalArea', 'roomCount'],
  properties: {
    address: {
      type: 'object',
      required: ['street', 'city', 'postalCode'],
      properties: { /* ... */ }
    },
    propertyType: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'] },
    totalArea: { type: 'number', minimum: 0 },
    roomCount: { type: 'integer', minimum: 1 },
  }
}
```

**If tests fail after schema changes:** Check that JSON Schema matches Zod schema exactly.

---

- **ES Modules:** Project uses ESM (`"type": "module"`). Always use `.js` extensions in imports.
- **TypeScript:** `moduleResolution: "bundler"` - compatible with modern bundlers
- **File Uploads:** Max 10MB enforced by multipart plugin
- **Port:** Default 8000 (configurable via PORT env var)
- **CORS:** Only allows frontend URL from config
- **Database:** PostgreSQL 15+ required, hosted on Supabase
- **Node Version:** 20+ required (specified in package.json engines)

## Next Steps (Roadmap)

See [NEXT-STEPS.md](./NEXT-STEPS.md) for detailed roadmap:

- ~~Plaid Integration (Income Verification)~~ ✅ COMPLETED
- ~~API Documentation (Swagger/OpenAPI)~~ ✅ COMPLETED
- ~~Rate Limiting~~ ✅ COMPLETED
- ~~Email Notifications (Resend)~~ ✅ COMPLETED
- PDF Generation for Contracts (optional)
- Redis Caching (performance optimization)
