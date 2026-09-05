# Hoheee — Solana Token Research

Stage-1 proof of concept: paste a Solana token mint address, get a multi-agent
research report with a final trading decision. Research tool, not financial advice.

Research background: "TradingAgents: Multi-Agents LLM Financial Trading Framework" (arXiv 2412.20138).

## Setup

Requires Node 18+ and Mimo LLM credentials.

```bash
npm install
```

Create `.env.local` in the repo root:

```bash
LLM_API_URL=https://token-plan-sgp.xiaomimimo.com/v1/chat/completions
LLM_API_KEY=<your-key>
LLM_MODEL=mimo-v2.5
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a Solana mint
address (32-44 base58 characters), check the token preview, and run the analysis.

## Architecture

Text pipeline diagram — one run flows left to right:

```text
mint → token summary (DexScreener)
  → L1: 4 analysts in parallel: onchain | technical | sentiment | news
  → L2: bull vs bear debate (2 rounds)
  → L3: risk review (liquidity | rugpath | concentration, parallel)
  → L4: decider → final decision (RATING / CONFIDENCE / KEY RISKS / ...)
  → saved to Supabase, share link /r/<id>
```

Each layer is one JSON endpoint (`POST /api/l1` … `POST /api/l4`), chained
by the browser, so every step stays far under the Vercel Hobby 300s ceiling
(soft budgets: L1 <60s, L2 <90s, L3 <60s, L4 <30s). The legacy flash flow
(`POST /api/analyze` SSE: `token_found → agent_start → tool_call →
tool_result → agent_report → debate_turn → decision → done`) still exists
but the UI now runs the layered flow.

Supabase env (share links):

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-url>          # public read
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>     # public read
SUPABASE_SERVICE_ROLE_KEY=<service-key>      # server-only write (never to browser)
```

Run once in the Supabase SQL editor (see
`docs/superpowers/specs/2026-09-05-layered-pipeline-design.md` for the exact
statement): create table `reports` with public-read RLS, no public insert.

Key files: `lib/pipeline/orchestrator.ts` (legacy flash pipeline), `lib/layered/`
(L1-L4 per-layer flow), `lib/agents/`
(`runAnalyst` runtime + shared types), `lib/tools/` (dexscreener, rugcheck,
coingecko fetchers + analyst tool lists), `app/api/l1/route.ts` through
`app/api/l4/route.ts` (layered JSON endpoints), `app/api/analyze/route.ts`
(legacy flash SSE framing), `app/page.tsx` + `components/layered/` + `hooks/`
(live layered feed UI, one file per step).

## Tests

```bash
npm test                       # fast unit tests only (seconds)
npm run test:e2e               # live e2e — needs dev server + ~1 minute
```

The e2e test (`tests/e2e.test.ts`) posts a real mint to a running dev server
and asserts the full SSE event chain plus a non-empty decision. It needs
`npm run dev` on port 3000 first.

## Known Limits

- **Vercel free 60s wall:** a run takes under a minute, inside the
  serverless timeout. The analyze route is deployable to Vercel free tier.
- **CoinGecko public-tier rate limits:** unauthenticated calls are throttled
  (HTTP 429). Analysts may call CoinGecko concurrently, and each fetcher
  degrades gracefully to an error string the analysts handle honestly.
- **Reasoning-model latency:** first token can take minutes on the Mimo
  endpoint; analyst reports stream incrementally and each stage waits on the
  last. Long waits are normal, not hangs.
- **Thin data for new tokens:** low liquidity and short price history make
  signals unreliable. The system can be wrong — output is automated research,
  not financial advice.

## GitHub Actions Report Generation

Reports generate in CI via manual dispatch — the laptop can stay off.

1. Open the repo on GitHub → Actions → "Generate report" → Run workflow.
2. Enter the `mint` input (Solana base58 address, 32-44 chars).
3. The job runs `npx tsx scripts/generate-report.ts "<mint>"` (about a minute),
   commits the new `runs/<runId>.json`, and pushes. The push triggers a Vercel
   rebuild that pre-renders the new `/r/<runId>` page.

Required repo secrets:

| Secret        | Purpose                        |
| ------------- | ------------------------------ |
| `LLM_API_URL` | Chat-completions endpoint URL  |
| `LLM_API_KEY` | API key for the LLM endpoint   |
| `LLM_MODEL`   | Model name (e.g. mimo-v2.5)      |

Secrets pass via env only and never print in logs. Do not add `[skip ci]` to
the report commit message — Vercel skips such commits and auto-publish would
silently break. `runs/*.json` files are committed on purpose (they are the
CMS for the static report pages); never gitignore `runs/`.

## Vercel Deploy

1. Connect the repo in the Vercel dashboard (framework preset: Next.js,
   defaults for build `next build` and output).
2. Add the same three env vars (`LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`) if
   the preview/token endpoints need them. No extra config required.
3. Every push (including Actions report commits) rebuilds and publishes new
   `/r/[id]` pages.

## Live analysis (root)

Enter a mint at `/`. `POST /api/analyze` streams the chain (mini
analysts + 1 debate round + decider, `mimo-v2.5`) via SSE, under 45 seconds.
Vercel env (Production): `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL=mimo-v2.5`.
Demo guardrails: ~12s per LLM call, 10 runs/hour/IP, partial failures
continue as MISSING reports.
