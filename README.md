# AI-Powered Logistics Analytics Dashboard

A full-stack analytics product over a logistics dataset (calendar year 2025, 400 orders) supporting three levels of intelligence:

- **Descriptive** — a KPI + chart dashboard.
- **Diagnostic** — a natural-language query interface ("which carrier delays most?").
- **Predictive/Prescriptive** — demand forecasting with an inventory recommendation.

The AI layer **only orchestrates** deterministic backend tools — it routes a question to a tool and emits structured arguments, but never computes or invents numbers, and never runs raw SQL.

- **Live app:** _<web URL>_
- **API:** _<api URL>_/api/dashboard

---

## Setup

### Prerequisites
- Node.js 20.9+
- pnpm 10+

### Local development
```bash
pnpm install
cp apps/api/.env.example apps/api/.env            # set OPENAI_API_KEY (only the /ask endpoint needs it)
cp apps/web/.env.local.example apps/web/.env.local

pnpm dev        # runs the API (:3001) and the web app (:3000) together
```
Open http://localhost:3000. The dashboard and forecasting work without an API key; only the natural-language **Ask AI** tab requires `OPENAI_API_KEY`.

Run them separately with `pnpm dev:api` / `pnpm dev:web` if needed. `pnpm test` runs the API test suite.

### Environment variables
| App | Variable | Required | Default | Purpose |
|-----|----------|----------|---------|---------|
| api | `OPENAI_API_KEY` | for `/ask` only | – | OpenAI auth for NL routing |
| api | `OPENAI_MODEL` | no | `gpt-4o` | routing model |
| api | `PORT` | no | `3001` | local port |
| web | `NEXT_PUBLIC_API_BASE_URL` | local dev | `/api` | API base URL the **browser** calls (`.env.local` sets `http://localhost:3001/api` for dev) |
| web | `INTERNAL_API_BASE_URL` | docker | `http://localhost:3001/api` | API URL used by **SSR** (server-side) |

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

### Design decisions
- **No raw SQL / no DB:** the 400-row dataset is held in memory and queried by a typed, structured query engine — directly satisfying "avoid executing raw AI-generated SQL" and right-sized for the data.
- **Swappable data source:** services depend on an `OrderRepository` interface, so the in-memory store can become Postgres with no change to business logic.
- **Pluggable forecasting & AI tools:** forecast methods and analytical tools sit behind interfaces (resolved by a factory / a tool registry), so adding one doesn't touch existing services.
- **Testable orchestration:** the LLM router is an interface, so the orchestrator is unit-tested with a fake router (no network).

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
- **AI usage disclosure:** OpenAI (`gpt-4o`) is used for question→tool routing only.

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
- No persisted query history. (Optional HTTP Basic Auth is available at the proxy — see Deployment.)
- `/ask` requires `OPENAI_API_KEY`; without it the endpoint returns a graceful error while the rest of the app keeps working.

## Future Improvements
- Postgres + a read-only SQL/view layer behind the same `OrderRepository` interface.
- Multi-step tool plans and ambiguous-query clarification.
- Richer forecasting (Holt-Winters / seasonality), confidence intervals.
- Caching, query history, and e2e tests.

---

## Tests
```bash
pnpm test     # 33 unit tests: KPIs, query engine, strategies, services, orchestrator
```
The orchestrator is tested with a fake `LlmRouter`, so the suite runs offline.

## Deployment (self-hosted, Docker / Portainer)

A reverse proxy (nginx) fronts both apps on **one origin**: `/api/*` → NestJS, everything else → Next.js. The browser calls the API via the relative `/api` path, so there is **no CORS**; SSR reaches the API over the internal docker network.

The proxy is attached to an existing **macvlan** network so it gets its own LAN IP (default `10.10.10.63` on `net1010`) — browse the app directly at `http://10.10.10.63`, no host port published. `web` and `api` stay on the internal bridge only (not exposed to the LAN).

```
LAN ─ http://10.10.10.63 ─→ nginx (macvlan net1010 + internal bridge)
                              ├─ /api/* → api  :3001  (NestJS)
                              └─ /*     → web  :3000  (Next.js standalone)
```

Files: `docker-compose.yml`, `nginx.conf` (baked into the proxy image), `apps/{api,web,proxy}/Dockerfile`.

**Run locally:**
```bash
cp .env.docker.example .env   # set OPENAI_API_KEY
docker compose up -d --build
# open http://10.10.10.63  (the proxy's macvlan IP)
```

The macvlan network `net1010` must already exist on the host; `PROXY_IP` must be inside its subnet and unused (ideally outside the DHCP range). Override the defaults with `LAN_NETWORK` / `PROXY_IP` env vars.

**Portainer:** Stacks → Add stack → paste `docker-compose.yml` (or point to the Git repo). Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, `LAN_NETWORK`, `PROXY_IP`) as stack environment variables, then Deploy. `web` and `api` stay on the internal bridge; only the proxy is reachable on the LAN via its macvlan IP.

> **macvlan caveat:** by Docker's design the host itself usually cannot reach a macvlan container IP (other LAN devices can). If you also need access *from the host*, add a macvlan shim interface on the host.

- **HTTP Basic Auth:** set `BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD` on the `proxy` service (compose env / Portainer / `.env`) to lock the **whole site** (app + `/api`) behind a login. Leave them empty to keep it open. Credentials are turned into an `htpasswd` file at container startup — never baked into the image or committed. The browser authenticates once, then automatically sends the credentials to `/api` too (same origin).
- **HTTPS / domain:** add a `server` block listening on `443` with your TLS cert in `nginx.conf` (e.g. mount certs from Let's Encrypt / certbot) and publish ports `80`+`443`. Always pair Basic Auth with HTTPS so the credentials are not sent in clear text.

#### CI/CD — push-deploy to Portainer (GitHub Actions)
Active deployment: GitHub Actions builds + pushes both images to GHCR, then calls a **Portainer webhook** to re-pull and redeploy. The server never builds.

```
push to main → GH Actions: build → push ghcr.io/<owner>/logistics-{api,web,proxy} → POST Portainer webhook → Portainer re-pulls & redeploys
```

1. **Portainer:** deploy a stack from this Git repo using `docker-compose.prod.yml` (it pulls all three images from GHCR — the nginx config is baked into the `logistics-proxy` image, so there is no host bind-mount). Set stack env: `IMAGE_PREFIX=ghcr.io/<owner-lowercase>`, `TAG=latest`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `LAN_NETWORK=net1010`, `PROXY_IP=10.10.10.63`. Enable the stack **webhook** and copy its URL.
2. **GitHub:** add repo secret `PORTAINER_WEBHOOK_URL` = that webhook. Images push to GHCR via the built-in `GITHUB_TOKEN` (no extra secret).
3. Push to `main` → `.github/workflows/deploy.yml` runs automatically (or trigger manually via *workflow_dispatch*). Each image is tagged `:latest` and `:<sha>`.

Notes: GHCR packages are private by default — either make them public, or add GHCR registry credentials in Portainer so it can pull. The webhook redeploys with `:latest`; enable "re-pull image" on the Portainer stack so the new image is fetched.

## Project structure

The backend is organised **by feature** (package-by-feature), not by technical layer
(`dto/`, `interfaces/`, `utils/`). Files that change together live together. The
conventional layered concepts still exist — they are just placed where they belong:

| Conventional concept | Where it lives here |
|----------------------|---------------------|
| **interfaces** (abstractions / ports) | `apps/api/src/domain/ports.ts` — `OrderRepository`, `ForecastStrategy`, `AnalyticalTool`, `LlmRouter`, `ToolDefinition` + DI tokens |
| **DTOs / validation** | `packages/shared/src/schemas.ts` — Zod schemas (`QuerySpec`, `ForecastSpec`, `AskRequest`, `Filters`) validated at every boundary; `types.ts` — the typed contracts. Zod (not class-validator) so the **same DTOs are shared with the frontend** and validate LLM output |
| **utils** (pure helpers) | co-located with their feature: `analytics/kpi.ts`, `analytics/query-engine.ts`, `analytics/chart-select.ts`, `ai/normalize-args.ts` |

```
packages/shared/src        types.ts + schemas.ts  → the cross-app contract (DTOs)
apps/api/src
  domain/ports.ts          all interfaces + DI tokens
  dataset/                 InMemoryOrderRepository  (Repository pattern)
  analytics/               kpi, query-engine, chart-select, QueryExplanationBuilder, service, controller
  forecast/                ForecastService + strategies/ (Strategy) + ForecastStrategyFactory (Factory)
  ai/                      OrchestratorService, OpenAiLlmRouter, tools/ (Registry), normalize-args, filter
  configure-app.ts         shared app config; main.ts (local) / api/index.ts (serverless)
apps/web/src
  app/                     routes: page.tsx (dashboard), ask/page.tsx, error.tsx, loading.tsx, layout.tsx
  components/              app-sidebar, chart-renderer, chat-panel, explainability-panel, kpi-card, ui/
  lib/                     api.ts (fetch), labels.ts (display labels)
```
