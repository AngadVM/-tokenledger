# TokenLedger

An OpenAI-compatible LLM gateway with per-team cost attribution and budget enforcement. Every model call passes through a "toll booth" that identifies the caller, checks its budget, forwards to the real provider, and records exactly what it cost — so AI spend is attributable instead of a monthly surprise.

## Status

**M0 — Foundation (in progress).** NestJS app shell, Prisma schema for the full data model, env validation, Postgres + Redis via docker-compose, Jest (unit + integration) wired, CI on GitHub Actions. The gateway proxy, budget counters, and usage reports land in the next milestones (M1–M5).

## Prerequisites

- Node 20+ (tested on 22/26)
- npm
- Docker (for local Postgres + Redis)

## Quickstart

```bash
cp .env.example .env          # edit credentials
docker compose up -d          # Postgres + Redis
npm install
npx prisma migrate dev        # apply migrations
npx prisma db seed            # seed the model price table
npm run start:dev
```

Verify the app is up and can reach both services:

```bash
curl http://localhost:3000/health
# {"status":"ok","db":"up","redis":"up","uptime":3.2}
```

## Configuration

All configuration is loaded from `.env` and validated at boot (see `src/config/env-schema.ts`).

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for admin JWT signing (≥16 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin credentials (M2) |
| `UPSTREAM_BASE_URL` | Where the gateway forwards model calls (e.g. `http://localhost:11434/v1` for Ollama) |
| `UPSTREAM_API_KEY` | Key used against the upstream provider |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Run the gateway with watch mode |
| `npm run build` | Compile with `nest build` |
| `npm run lint` | ESLint (flat config, prettier-aware) |
| `npm run test` | Run unit + integration tests |
| `npm run test:unit` | Unit tests (`test/unit`) |
| `npm run test:integration` | Integration tests (`test/integration`) — requires Postgres + Redis up |
| `npm run test:cov` | Tests with coverage (threshold ≥80%) |

## Project structure

```
src/
  app.module.ts         # root module: Config, Prisma, Redis
  main.ts               # bootstrap
  config/env-schema.ts  # joi-validated environment contract
  health/health.controller.ts
  prisma/               # PrismaService (global)
  redis/                # ioredis client provider (global)
prisma/
  schema.prisma         # Team, ApiKey, UsageRecord, PriceEntry
  seed.ts               # seeds model prices
test/
  unit/                 # pure logic tests
  integration/          # app boot against real Postgres + Redis
```

## Roadmap

- M1: virtual API keys (hashing), pricing engine
- M2: JWT admin auth + API-key guard
- M3: the toll — `POST /v1/chat/completions` proxy with budget pre-check and usage recording
- M4: usage report endpoints + Redis budget counters
- M5: demo script (Ollama), docs polish

## License

MIT