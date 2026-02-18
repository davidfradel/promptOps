# PromptOps

Product research platform that scrapes community posts from Reddit and HackerNews, analyzes them with Claude AI to extract actionable insights, and generates product specs.

## Features

- **Community Scraping** — Automated collection from Reddit (JSON API) and HackerNews (Firebase + Algolia)
- **AI-Powered Analysis** — Claude extracts pain points, competitors, trends, and sentiment from raw posts
- **Spec Generation** — Generates product specs in Markdown, Claude Code, or Linear formats
- **Discovery Engine** — Category-based onboarding with automated insight feeds
- **Auth & Multi-tenancy** — JWT authentication with full data isolation per user
- **Background Processing** — BullMQ job queue for scraping, analysis, and generation pipelines

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- Anthropic API key (for AI analysis and spec generation)

## Quick Start

### Docker (Production)

```bash
# Set required environment variables
export ANTHROPIC_API_KEY=your-key-here
export JWT_SECRET=your-secret-here

# Start all services
docker compose up -d
```

This starts PostgreSQL, Redis, the API server (port 3001), a database migration runner, and the web frontend (port 80).

### Manual (Development)

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Install dependencies
cp .env.example .env        # Edit with your ANTHROPIC_API_KEY
npm install

# Build shared types
npm run build -w packages/shared

# Push database schema
npx prisma db push --schema apps/api/prisma/schema.prisma

# Start dev servers (in separate terminals)
npm run dev:api              # API on http://localhost:3001
npm run dev:web              # Frontend on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the API server.

## Architecture

```
promptops/                        # npm workspaces monorepo
├── packages/shared/              # @promptops/shared — types, enums, Zod schemas
├── apps/api/                     # Express 5 + Prisma + BullMQ
│   ├── prisma/schema.prisma      # 8 models, 4 enums
│   └── src/
│       ├── routes/               # REST endpoints
│       ├── services/             # Scrapers, analysis, generation, queue
│       ├── lib/                  # Prisma, Redis, auth, response helpers
│       ├── middleware/           # Error handler, rate limiter, auth
│       └── utils/                # Claude client, Pino logger
└── apps/web/                     # React 19 + Vite + Tailwind v4
    └── src/
        ├── pages/                # Route-level components
        ├── components/           # UI, layout, feature components
        ├── hooks/                # Data fetching and mutation hooks
        └── lib/api.ts            # Fetch wrapper for /api/v1/*
```

## Tech Stack

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Runtime    | Node.js >= 20, ESM                                              |
| API        | Express 5, Zod validation, Pino logging                         |
| Database   | PostgreSQL 16 via Prisma ORM                                    |
| Queue      | BullMQ on Redis 7                                               |
| AI         | Anthropic SDK (Claude Sonnet 4.5)                               |
| Auth       | bcryptjs + jsonwebtoken (Bearer tokens, 7-day expiry)           |
| Frontend   | React 19, React Router v7, Tailwind CSS v4, Recharts            |
| TypeScript | Strict mode, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` |

## Environment Variables

| Variable            | Required | Default                           | Description                        |
| ------------------- | -------- | --------------------------------- | ---------------------------------- |
| `DATABASE_URL`      | Yes      | —                                 | PostgreSQL connection string       |
| `REDIS_URL`         | No       | `redis://localhost:6379`          | Redis for BullMQ                   |
| `ANTHROPIC_API_KEY` | Yes\*    | —                                 | Claude API key (\*for AI features) |
| `JWT_SECRET`        | No       | `dev-secret-change-in-production` | Secret for JWT signing             |
| `PORT`              | No       | `3001`                            | API server port                    |
| `NODE_ENV`          | No       | `development`                     | Environment                        |
| `LOG_LEVEL`         | No       | `info`                            | Pino log level                     |
| `CORS_ORIGINS`      | No       | `*`                               | Allowed CORS origins               |
| `SENTRY_DSN`        | No       | —                                 | Sentry error tracking DSN          |

## API Endpoints

### Health

```
GET    /api/v1/health
```

### Auth

```
POST   /api/v1/auth/register       # { email, password, name? } → { token, user }
POST   /api/v1/auth/login          # { email, password } → { token, user }
GET    /api/v1/auth/me             # Current user
```

### Projects (requires auth)

```
GET    /api/v1/projects            # List (cursor pagination)
POST   /api/v1/projects            # Create
GET    /api/v1/projects/:id        # Detail (includes sources, counts)
PATCH  /api/v1/projects/:id        # Update
DELETE /api/v1/projects/:id        # Delete
POST   /api/v1/projects/:id/analyze  # Trigger AI analysis pipeline
```

### Sources (requires auth)

```
GET    /api/v1/sources             # List (?projectId= filter)
POST   /api/v1/sources             # Create
GET    /api/v1/sources/:id         # Detail
DELETE /api/v1/sources/:id         # Delete
POST   /api/v1/sources/:id/scrape  # Trigger scrape job
GET    /api/v1/sources/:id/jobs    # Scrape job history
```

### Insights (requires auth)

```
GET    /api/v1/insights            # List (?projectId=&type=&minSeverity=&tag=)
GET    /api/v1/insights/:id        # Detail (includes sources + raw posts)
```

### Specs (requires auth)

```
GET    /api/v1/specs               # List (?projectId=)
POST   /api/v1/specs               # Create
GET    /api/v1/specs/:id           # Detail
PATCH  /api/v1/specs/:id           # Update
DELETE /api/v1/specs/:id           # Delete
POST   /api/v1/specs/generate      # AI spec generation
```

## Development

### Scripts

| Command                     | Description                 |
| --------------------------- | --------------------------- |
| `npm run dev:api`           | Start API dev server        |
| `npm run dev:web`           | Start frontend dev server   |
| `npm run build`             | Build shared + API          |
| `npm run build -w apps/web` | Build frontend (tsc + Vite) |
| `npm run lint`              | ESLint                      |
| `npm run format`            | Prettier (write)            |
| `npm run format:check`      | Prettier (check)            |

### Database

| Command                           | Description              |
| --------------------------------- | ------------------------ |
| `npm run db:push -w apps/api`     | Push schema to DB (dev)  |
| `npm run db:migrate -w apps/api`  | Create migration         |
| `npm run db:generate -w apps/api` | Regenerate Prisma client |
| `npm run db:studio -w apps/api`   | Open Prisma Studio GUI   |

## Testing

```bash
npm test                    # Run all tests (API + web)
npm run test:api            # API tests only
npm run test:web            # Web tests only
```

- **Framework**: Vitest 4 with `@testing-library/react` for component tests
- **API tests**: Integration tests with Prisma and BullMQ mocks
- **Web tests**: Component/hook tests with mocked API layer

## CI/CD

GitHub Actions runs on push/PR to `main`:

1. **Lint** — ESLint + Prettier check
2. **Test API** — With PostgreSQL 16 and Redis 7 service containers
3. **Test Web** — Component and hook tests with coverage
4. **Build** — Full TypeScript compilation (after lint + tests pass)
5. **Docker** — Build API and web images (main branch only, push events)

## Docker

| Service    | Image         | Port | Description                      |
| ---------- | ------------- | ---- | -------------------------------- |
| `postgres` | postgres:16   | 5432 | PostgreSQL database              |
| `redis`    | redis:7       | 6379 | Redis for BullMQ job queue       |
| `api`      | promptops-api | 3001 | Express API + BullMQ worker      |
| `web`      | promptops-web | 80   | Nginx serving React frontend     |
| `migrate`  | promptops-api | —    | One-shot Prisma migration runner |

Both `api` and `web` use multi-stage Docker builds for minimal production images.

## License

ISC
