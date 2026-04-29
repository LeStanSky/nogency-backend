# Integration Notes: nogency-back + nogency-ai

**Analysis date:** 2026-02-01
**Goal:** Integrate the backend and frontend into a single working project

---

## Project 1: Backend (nogency-back)

**Path:** `C:\Users\stale\Documents\Projects\JS Projects\nogency-back`

### Tech stack

| Component  | Technology                        |
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

### Server configuration

- **Port:** `8000` (env variable `PORT`)
- **CORS origin:** from `FRONTEND_URL` (default `http://localhost:3000`)
- **API prefix:** `/api/v1`

### Main endpoints

| API          | Prefix                 | Description                             |
| ------------ | ---------------------- | --------------------------------------- |
| Auth         | `/api/v1/auth`         | Registration, login, JWT                |
| Profiles     | `/api/v1/profiles`     | Owner/tenant profiles                   |
| Documents    | `/api/v1/documents`    | Upload, AI verification (Claude Vision) |
| Properties   | `/api/v1/properties`   | Property CRUD                           |
| Listings     | `/api/v1/listings`     | Listings, publishing                    |
| Applications | `/api/v1/applications` | Applications with AI scoring            |
| Contracts    | `/api/v1/contracts`    | Contract lifecycle                      |
| Payments     | `/api/v1/payments`     | Stripe integration, webhooks            |
| Health       | `/health`              | Health check                            |
| Docs         | `/docs`                | Swagger UI                              |

### Run commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot-reload (port 8000)
npm run build        # TypeScript compilation
npm start            # Production start
npm test             # Tests in watch mode
npm run test:coverage # Tests with coverage
```

### Environment variables (.env)

**Required:**

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

**Optional:**

```env
NODE_ENV=development
PORT=8000
RESEND_API_KEY=
JWT_EXPIRES_IN=7d
SENTRY_DSN=
LOG_LEVEL=info
```

### Key files

- `src/config.ts` - Centralized configuration
- `src/app.ts` - Fastify application factory
- `src/index.ts` - Entry point
- `src/routes/*.ts` - Route handlers
- `src/controllers/*.ts` - Business logic
- `src/services/*.ts` - External services (AI, Storage, Stripe)
- `prisma/schema.prisma` - Database schema

---

## Project 2: Frontend (nogency-ai)

**Path:** `C:\Users\stale\Documents\Projects\JS Projects\nogency-ai`

### Tech stack

| Component       | Technology                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 16.0.10              |
| React           | 19.0.1                       |
| Language        | TypeScript 5.6.3             |
| ORM             | Drizzle ORM                  |
| Database        | PostgreSQL (dedicated)       |
| Auth            | NextAuth 5.0.0-beta.25       |
| AI              | Groq LLM                     |
| Styling         | TailwindCSS 4.1.13           |
| UI              | Radix UI + Custom components |
| Package Manager | pnpm 9.12.3                  |

### Server configuration

- **Port:** `3000` (Next.js default)
- **API routes:** Built into Next.js (`app/api/...`)

### Internal API endpoints (Next.js routes)

| Endpoint            | Method | Description              |
| ------------------- | ------ | ------------------------ |
| `/api/auth/*`       | \*     | NextAuth handlers        |
| `/api/chat`         | POST   | Send message (streaming) |
| `/api/chat?id=...`  | DELETE | Delete chat              |
| `/api/history`      | GET    | Chat history             |
| `/api/vote`         | POST   | Like/dislike             |
| `/api/document`     | POST   | Create document          |
| `/api/files/upload` | POST   | Upload files             |
| `/api/suggestions`  | POST   | AI suggestions           |

### Run commands

```bash
pnpm install         # Install dependencies
pnpm dev             # Dev server (port 3000)
pnpm build           # Production build
pnpm start           # Production start
```

### Environment variables (.env)

```env
AUTH_SECRET=****
GROQ_API_KEY=****
POSTGRES_URL=****
REDIS_URL=****
BLOB_READ_WRITE_TOKEN=****
```

### Key files

- `next.config.ts` - Next.js configuration
- `proxy.ts` - Middleware/Proxy settings
- `app/(auth)/auth.ts` - NextAuth configuration
- `app/(chat)/api/chat/route.ts` - Main chat endpoint
- `lib/ai/providers.ts` - Groq AI configuration
- `lib/db/schema.ts` - Drizzle ORM schema
- `lib/utils.ts` - Fetch helpers

---

## Current state

### Problem: the projects are fully independent

1. **Different databases** - the backend uses Supabase PostgreSQL, the frontend has its own PostgreSQL
2. **Different authentication** - backend uses JWT, frontend uses NextAuth
3. **Different AI providers** - backend uses Claude, frontend uses Groq
4. **The frontend does not call the backend** - it relies on its own API routes

### What each project represents

- **Backend (nogency-back):** API for a rental management platform with AI-powered tenant scoring
- **Frontend (nogency-ai):** AI chatbot for real estate consultations

---

## Integration plan

### Stage 1: Run in parallel (baseline)

**Terminal 1 - Backend:**

```bash
cd C:\Users\stale\Documents\Projects\JS Projects\nogency-back
npm run dev
# http://localhost:8000
```

**Terminal 2 - Frontend:**

```bash
cd C:\Users\stale\Documents\Projects\JS Projects\nogency-ai
pnpm dev
# http://localhost:3000
```

**Connectivity check:**

- Backend: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`

### Stage 2: CORS configuration

**Backend `.env`:**

```env
FRONTEND_URL=http://localhost:3000
```

### Stage 3: API client on the frontend

Create `lib/api/backend-client.ts`:

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

// Usage examples:
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

**Frontend `.env`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Stage 4: Authentication synchronization

**Option A: Frontend uses JWT issued by the backend**

- On login, call `/api/v1/auth/login`
- Store the JWT in cookies/localStorage
- Pass the JWT via the `Authorization: Bearer <token>` header

**Option B: Shared user database**

- Synchronize the User schemas between Prisma and Drizzle
- Use a single PostgreSQL database

**Option C: Proxy through Next.js**

- Next.js API routes proxy requests to the backend
- NextAuth issues a token and Next.js attaches it to outgoing requests

### Stage 5: Feature integration

Wire up on the frontend:

1. **Registration/Login** → `/api/v1/auth`
2. **Profiles** → `/api/v1/profiles`
3. **Document upload** → `/api/v1/documents`
4. **Property management** → `/api/v1/properties`
5. **Listings** → `/api/v1/listings`
6. **Applications** → `/api/v1/applications`
7. **Contracts** → `/api/v1/contracts`
8. **Payments** → `/api/v1/payments`

---

## Architecture options

### Option 1: AI chat + rental platform (hybrid)

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

### Option 2: Unified backend (full integration)

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │
│  (Next.js)      │     │  (Fastify)      │
│                 │     │                 │
│  - UI only      │     │  - All APIs     │
│  - No own       │     │  - Auth         │
│    API routes   │     │  - AI (Claude)  │
│                 │     │  - DB           │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                           ┌─────────┐
                           │ Claude  │
                           └─────────┘
```

### Option 3: Microservices (extended)

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

## Integration checklist

- [ ] Run both services in parallel
- [ ] Verify CORS settings
- [ ] Create an API client on the frontend
- [ ] Choose an authentication strategy
- [ ] Synchronize or merge the databases
- [ ] Add UI components for backend features
- [ ] Wire up the registration/login forms
- [ ] Add property management pages
- [ ] Connect document upload
- [ ] Integrate payments (Stripe)
- [ ] E2E testing

---

## Useful links

- Backend Swagger: `http://localhost:8000/docs`
- Backend Health: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`

---

**Last updated:** 2026-02-01
