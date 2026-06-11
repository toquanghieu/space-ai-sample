# AI-Powered Logistics Analytics Dashboard

A full-stack analytics product over a logistics dataset (calendar year 2025, 400 orders) supporting three levels of intelligence:

- **Descriptive** — a KPI + chart dashboard.
- **Diagnostic** — a natural-language query interface ("which carrier delays most?").
- **Predictive/Prescriptive** — demand forecasting with an inventory recommendation.

The AI layer **only orchestrates** deterministic backend tools — it routes a question to a tool and emits structured arguments, but never computes or invents numbers, and never runs raw SQL.

- **Live app:** _<web URL>_ · no login required
- **API:** _<api URL>_/api/dashboard

---

## Setup

### Prerequisites
- Node.js 20.9+
- pnpm 10+

### Local development
```bash
pnpm install

# 1) API (NestJS) on :3001
cd apps/api
cp .env.example .env          # set OPENAI_API_KEY (only needed for the /ask NL endpoint)
pnpm build && pnpm start      # or: pnpm start:dev

# 2) Web (Next.js) on :3000  — in a second terminal
cd apps/web
cp .env.local.example .env.local
pnpm dev
```
Open http://localhost:3000. The dashboard and forecasting work without an API key; only the natural-language **Ask AI** tab requires `OPENAI_API_KEY`.

### Environment variables
| App | Variable | Required | Default | Purpose |
|-----|----------|----------|---------|---------|
| api | `OPENAI_API_KEY` | for `/ask` only | – | OpenAI auth for NL routing |
| api | `OPENAI_MODEL` | no | `gpt-4o-mini` | routing model |
| api | `PORT` | no | `3001` | local port |
| web | `NEXT_PUBLIC_API_BASE_URL` | yes | `http://localhost:3001/api` | API base URL |

---

## Architecture

### Overview
A pnpm-workspace monorepo:
- `apps/web` — Next.js (App Router) + Tailwind + shadcn/ui + Recharts.
- `apps/api` — NestJS. Loads the CSV into memory and exposes analytics, forecasting, and an AI-orchestration endpoint.
- `packages/shared` — TypeScript domain/contract types + Zod schemas, shared by both apps.

### Three separated layers (per spec)
1. **AI interpretation** — `OrchestratorService` + `OpenAiLlmRouter`. Picks a tool and structured args.
2. **Data computation** — `query-engine.ts` (structured filter/group/aggregate), forecast strategies. Pure functions.
3. **Business logic** — `kpi.ts` (the frozen KPI contract), `AnalyticsService`, `ForecastService`.

### Data flow
```
User question
  → POST /api/ask
  → OpenAiLlmRouter (LLM picks tool + emits structured JSON args)
  → AnalyticalTool.run(args): Zod validation  ──(invalid)──▶ 400, never executed
  → deterministic computation (query engine / forecast strategy)
  → result + explanation (filters, metrics, dimensions, query plan)
  → UI: NL answer + chart + explainability panel / inventory recommendation
```
The dashboard uses the same computation layer directly via `GET /api/dashboard`.

### Design decisions & patterns (SOLID)
- **Repository** (`OrderRepository` port → `InMemoryOrderRepository`): business logic depends on an abstraction, so the data source can become Postgres with no logic change (DIP).
- **Strategy + Factory** (`ForecastStrategy` → `ExponentialSmoothingStrategy` / `MovingAverageStrategy` / `LinearRegressionStrategy`, resolved by `ForecastStrategyFactory`): adding a forecasting method is a one-line factory registration — the service never changes (OCP).
- **Registry** (`AnalyticalTool` port + tool list): the orchestrator routes through a registry; adding an AI tool means registering a provider, not editing the orchestrator (OCP).
- **Builder** (`QueryExplanationBuilder`): assembles the explainability payload, keeping it out of the service (SRP).
- **DIP via DI tokens** (`ORDER_REPOSITORY`, `LLM_ROUTER`, `ANALYTICAL_TOOLS`): every cross-layer dependency is an interface, which also makes the orchestrator unit-testable with a fake router (no network).
- **No raw SQL / no DB**: 400 rows are held in memory and queried by a typed, structured query engine — this directly satisfies "avoid executing raw AI-generated SQL" and is right-sized (not over-engineered).

### API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard` | KPIs + 3 charts |
| POST | `/api/query` | run a structured `QuerySpec` (Zod-validated) |
| POST | `/api/forecast` | run a `ForecastSpec` |
| POST | `/api/ask` | natural-language question → orchestrated tool result |

---

## AI Approach
- **Interpretation:** the question is sent to OpenAI with `tool_choice: 'required'` and `temperature: 0`. The model's only job is to pick one tool and produce structured arguments.
- **Tool selection:** `query_analytics` for descriptive/diagnostic questions; `forecast_demand` for predictions. Tools describe themselves with a provider-agnostic definition, adapted to OpenAI function-calling by the router.
- **Safety:** every argument object is validated by Zod **before** execution. Invalid args → HTTP 400, never run. The model never emits numbers; all values come from the deterministic engine. Chart type is chosen deterministically from the result shape, not by the model.
- **AI usage disclosure:** OpenAI (`gpt-4o-mini`) is used for question→tool routing only. This codebase was built with AI coding assistance.

---

## Data Correctness (KPI definitions)
The dataset has 5 statuses (`delivered`, `delayed`, `in_transit`, `exception`, `canceled`) and 30 rows with no `delivery_date`. The frozen contract:
- **On-time delivery rate** = `delivered / (delivered + delayed)`. `in_transit`/`exception`/`canceled` are **excluded** from the denominator (no final outcome).
- **Avg delivery time** = mean of `delivery_date − order_date`, only over final rows that have a `delivery_date` (the 30 nulls are excluded).
- **"Delayed"** is always the `status` field, never re-derived from dates.

Known live values: 400 total · 304 delivered · 55 delayed · 84.7% on-time · ~3.7 day avg.

---

## Assumptions & Simplifications
- In-memory dataset (no DB), treated read-only, given only 400 rows.
- Forecasting aggregates to **monthly** grain. The **forecast value** is computed from the historical monthly series; the **20% safety stock** is a separate buffer added on top for the inventory recommendation (not part of the forecast).
- Three methods available (Strategy pattern): **exponential smoothing (Holt, default)**, moving average, linear regression. Default is exponential smoothing because it weights recent months more — so the early-month spike fades instead of dragging the trend down (as plain least-squares does), while still capturing level + trend from the actual data.
- Forecasts can be broken down per dimension via `groupBy` (e.g. one line per product category), each with its own inventory recommendation.
- Relative date phrases ("last 3 months") are anchored to the dataset max date `2025-12-30`.
- A question maps to exactly one tool (no multi-step compositional queries).

## Limitations
- Single-tool routing only; no chained/compositional analytics.
- Forecasting is monthly only; no seasonality (the dataset spans a single year, so a 12-month seasonal cycle cannot be estimated — would need 2+ years).
- No authentication, no persisted query history.
- `/ask` requires `OPENAI_API_KEY`; without it the endpoint returns a graceful 400 while the rest of the app keeps working.

## Future Improvements
- Postgres + a read-only SQL/view layer behind the same `OrderRepository` port.
- Multi-step tool plans and ambiguous-query clarification.
- Richer forecasting (Holt-Winters / seasonality), confidence intervals.
- Caching, query history, auth, Docker, and e2e tests.

---

## Tests
```bash
pnpm --filter api test     # 27 unit tests: KPIs, query engine, strategies, services, orchestrator
```
The orchestrator is tested with a fake `LlmRouter`, so the suite runs offline.

## Deployment (Vercel, two projects)
- **API project:** root `apps/api`, framework "Other", env `OPENAI_API_KEY`. Runs as a serverless function via `apps/api/api/index.ts`; the CSV is bundled (`vercel.json` `includeFiles`).
- **Web project:** root `apps/web`, framework Next.js, env `NEXT_PUBLIC_API_BASE_URL=<api URL>/api`.
- Fallback: if NestJS cold-starts are undesirable, deploy the API to Railway/Render and only change `NEXT_PUBLIC_API_BASE_URL` — no code change.

## Project structure

The backend is organised **by feature** (package-by-feature), not by technical layer
(`dto/`, `interfaces/`, `utils/`). Files that change together live together. The
conventional layered concepts still exist — they are just placed where they belong:

| Conventional concept | Where it lives here |
|----------------------|---------------------|
| **interfaces** (abstractions / ports) | `apps/api/src/domain/ports.ts` — `OrderRepository`, `ForecastStrategy`, `AnalyticalTool`, `LlmRouter`, `ToolDefinition` + DI tokens (the DIP layer) |
| **DTOs / validation** | `packages/shared/src/schemas.ts` — Zod schemas (`QuerySpec`, `ForecastSpec`, `AskRequest`, `Filters`) validated at every boundary; `types.ts` — the typed contracts. Zod (not class-validator) so the **same DTOs are shared with the frontend** and validate LLM output |
| **utils** (pure helpers) | co-located with their feature: `analytics/kpi.ts`, `analytics/query-engine.ts`, `analytics/chart-select.ts`, `ai/normalize-args.ts` |

```
packages/shared/src        types.ts + schemas.ts  → the cross-app contract (DTOs)
apps/api/src
  domain/ports.ts          all interfaces + DI tokens (DIP/ISP)
  dataset/                 InMemoryOrderRepository  (Repository pattern)
  analytics/               kpi, query-engine, chart-select, QueryExplanationBuilder, service, controller
  forecast/                ForecastService + strategies/ (Strategy) + ForecastStrategyFactory (Factory)
  ai/                      OrchestratorService, OpenAiLlmRouter, tools/ (Registry), normalize-args, filter
  configure-app.ts         shared app config; main.ts (local) / api/index.ts (Vercel serverless)
apps/web/src
  app/                     routes: page.tsx (dashboard), ask/page.tsx, error.tsx, loading.tsx, layout.tsx
  components/              app-sidebar, chart-renderer, chat-panel, explainability-panel, kpi-card, ui/
  lib/                     api.ts (fetch), labels.ts (display labels)
```

### SOLID — where each principle is applied
- **S** — single-responsibility files: `kpi.ts` only KPIs, `query-engine.ts` only querying, `QueryExplanationBuilder` only builds the explainability payload.
- **O** — add a forecast method or an AI tool without editing any service (Strategy+Factory, tool Registry).
- **L** — strategies and tools are interchangeable behind their interface.
- **I** — small, focused interfaces in `domain/ports.ts` (one method each).
- **D** — services depend on interface tokens (`ORDER_REPOSITORY`, `LLM_ROUTER`, `ANALYTICAL_TOOLS`), never on concretes; this is also what makes the orchestrator unit-testable with a fake router.
