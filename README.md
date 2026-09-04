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
LLM_MODEL=mimo-v2.5-pro
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
  → 4 analysts in parallel: onchain | technical | sentiment | news
  → bull vs bear debate (invest rounds)
  → research manager synthesis
  → trader plan
  → risk debate (aggressive vs conservative vs neutral)
  → portfolio manager → final decision (RATING / CONFIDENCE / KEY RISKS / ...)
```

Each stage streams over Server-Sent Events on `POST /api/analyze`:

```text
token_found → agent_start → reasoning* → tool_call → tool_result
  → agent_report (4 analysts + trader share this channel)
  → debate_turn (invest + risk phases) → decision → done
```

Key files: `lib/pipeline/orchestrator.ts` (pipeline), `lib/agents/`
(analysts, debaters, manager, trader, risk team, portfolio manager),
`lib/tools/` (dexscreener, rugcheck, coingecko fetchers), `app/api/analyze/route.ts`
(SSE framing), `app/page.tsx` + `components/` (live feed UI).

## Tests

```bash
npm test                       # fast unit tests only (15 tests, seconds)
npm run test:e2e               # live e2e — needs dev server + ~15-45min
```

The e2e test (`tests/e2e.test.ts`) posts a real mint to a running dev server
and asserts the full SSE event chain plus a non-empty decision. It needs
`npm run dev` on port 3000 first. Full runs take 13-20 minutes, so e2e runs on
a nightly cadence, not per-PR.

## Known Limits

- **Vercel free 60s wall:** a full run takes 13-20 minutes, far beyond the
  serverless timeout. Full runs are local-dev only (`npm run dev`); do not
  deploy the analyze route to Vercel free tier expecting completion.
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
3. The job runs `npx tsx scripts/generate-report.ts "<mint>"` (15-45 minutes),
   commits the new `runs/<runId>.json`, and pushes. The push triggers a Vercel
   rebuild that pre-renders the new `/r/<runId>` page.

Required repo secrets:

| Secret        | Purpose                        |
| ------------- | ------------------------------ |
| `LLM_API_URL` | Chat-completions endpoint URL  |
| `LLM_API_KEY` | API key for the LLM endpoint   |
| `LLM_MODEL`   | Model name (e.g. mimo-v2.5-pro)|

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

Note: the `POST /api/analyze` pipeline route is local-only — full runs take
13-20 minutes, far beyond the Hobby function cap (`maxDuration = 300`). Vercel
serves the pre-rendered static report pages; live analysis runs locally
(`npm run dev`) or in GitHub Actions.

## Production Live (/live)

Flow: user enters mint at `/live` → `POST /api/jobs` triggers the
`Generate report` workflow via `workflow_dispatch` (`{mint, run_id}`) → job publishes
each event to Upstash Redis → browser polls
`GET /api/jobs/<id>/events?cursor=n` every 5 seconds → decision renders inline,
`/r/<id>` link goes live ~1-2 min after rebuild.

One-time setup (free, no credit card):

1. Create a Redis database in the Upstash dashboard (region near Vercel).
2. `gh secret set UPSTASH_REDIS_REST_URL` and
   `gh secret set UPSTASH_REDIS_REST_TOKEN` (values from the Upstash dashboard).
3. In Vercel project env (Production, server-side): `GITHUB_TOKEN`
   (classic PAT scope `repo` + `workflow`), `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`. Redeploy.
4. Open `/live`, enter a mint. Without all three env vars above, `/api/jobs`
   returns an honest 500 "Server not configured".

Demo limits: one job at a time (429 when busy), 3 jobs/hour/IP,
60-minute watch timeout. `LLM_*` still not needed on Vercel.
