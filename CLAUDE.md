# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoGency AI is a backend API for a rental property management platform with AI-powered tenant screening. Built with Fastify, TypeScript, and PostgreSQL (via Supabase), using Anthropic Claude for AI verification and Stripe for payments.

**Tech Stack:** Node.js 20+, TypeScript 5+, Fastify 4.x, Prisma 5.x, PostgreSQL 15, Vitest

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
- Logging: info (dev) / error (prod)

**Config:** `src/config.ts` - Centralized configuration from environment variables

**Planned Structure:**

```
src/
├── routes/          # Fastify route handlers
├── controllers/     # Business logic layer
├── services/        # External services (AI, Storage, Email)
├── middleware/      # Auth, validation middleware
├── db/              # Prisma client singleton
├── types/           # Shared TypeScript types
└── utils/           # Helper functions
```

### Database Schema (Prisma)

**Core Models:**

- `Profile` - User accounts (OWNER/TENANT/ADMIN roles)
- `Document` - Uploaded documents with AI verification status
- `Listing` - Property listings (DRAFT/ACTIVE/RENTED/INACTIVE)
- `Application` - Tenant applications with AI scoring
- `Contract` - Rental contracts with dual signing
- `Payment` - Stripe payment tracking

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
- Coverage thresholds: Target >80%

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
RESEND_API_KEY            # Email service
FRONTEND_URL              # CORS allowed origin
```

Copy `.env.example` to `.env` and fill in values.

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
  app.get('/endpoint', async (request, reply) => {
    return { data: 'value' };
  });
}
```

**Prisma Client Usage:**

```typescript
import { prisma } from './db/client.js'; // Singleton instance

const user = await prisma.profile.create({
  data: { email: 'test@example.com' },
});
```

**Config Access:**

```typescript
import { config } from './config.js';

const apiKey = config.anthropic.apiKey;
```

**Error Handling:**

```typescript
reply.code(400).send({ error: 'Message' });
```

## Important Notes

- **ES Modules:** Project uses ESM (`"type": "module"`). Always use `.js` extensions in imports.
- **TypeScript:** `moduleResolution: "bundler"` - compatible with modern bundlers
- **File Uploads:** Max 10MB enforced by multipart plugin
- **Port:** Default 8000 (configurable via PORT env var)
- **CORS:** Only allows frontend URL from config
- **Database:** PostgreSQL 15+ required, hosted on Supabase
- **Node Version:** 20+ required (specified in package.json engines)

## Planned Features (Roadmap)

**Week 1-2:** Auth API, Document Upload, AI Verification
**Week 3-4:** Listings CRUD, Applications, AI Scoring
**Week 5-6:** Contracts, Payments (Stripe)

See README.md for detailed implementation plan.
