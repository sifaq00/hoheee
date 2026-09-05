# Aries — Solana Token Research

Paste a Solana mint, get a multi-agent research report: 4 analysts, bull-vs-bear
debate, risk review, final rating. Research tool, not financial advice.

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
NEXT_PUBLIC_SUPABASE_URL=<your-url>          # public read
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>     # public read
SUPABASE_SERVICE_ROLE_KEY=<service-key>      # server-only write (never to browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CHAIN_SECRET=<random-32-chars>               # layer chain HMAC (any secret works locally)
```

Create table `reports` once (Supabase SQL editor or any postgres client):

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  mint text not null,
  model text not null,
  token jsonb not null,
  reports jsonb not null,
  debate jsonb not null,
  risks jsonb not null,
  decision text not null,
  rating text,
  confidence text,
  created_at timestamptz not null default now(),
  wallet text,
  views integer not null default 0
);
alter table reports enable row level security;
create policy "public read" on reports for select using (true);

create table events (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  type text not null,
  report_id uuid,
  created_at timestamptz not null default now()
);
create index events_wallet_idx on events (wallet, created_at desc);
alter table events enable row level security;
-- no policies: service key only, analytics stay private
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (landing) or
[http://localhost:3000/analyze](http://localhost:3000/analyze) (terminal),
paste a Solana mint (32-44 base58 characters), and run.

## Architecture

One run flows left to right:

```text
mint → token summary (DexScreener)
  → L1: 4 analysts in parallel: onchain | technical | sentiment | news
  → L2: bull vs bear debate (2 rounds)
  → L3: risk review (liquidity | rugpath | concentration, parallel)
  → L4: decider → final decision (RATING / CONFIDENCE / KEY RISKS / ...)
  → saved to Supabase, share link /r/<id>
```

Each layer is one SSE endpoint (`POST /api/l1` … `POST /api/l4`), chained by
the browser with an HMAC chain token (`CHAIN_SECRET`) so layers cannot be
called out of order or forged — this also inherits the L1 rate limit
(10 runs/hour/IP via Upstash, fail-open without env). Every step streams
progress events plus a final `result` event. Soft budgets: L1 <90s, L2 <180s,
L3 <120s, L4 <60s — each under the Vercel Hobby 300s ceiling.

Key files: `lib/layered/` (L1-L4 flow, chain, SSE, Supabase, reducer),
`lib/agents/` (`runAnalyst` runtime + shared types), `lib/tools/`
(dexscreener, rugcheck, coingecko fetchers + analyst tool lists),
`app/api/l1-l4/route.ts`, `app/api/history/route.ts`,
`app/analyze/page.tsx` + `components/layered/` + `hooks/` (terminal UI, one
file per step), `app/page.tsx` + `components/landing/` (landing).
Old `runs/*.json` archives still render via file fallback on `/r/[id]`.

## Tests

```bash
npm test   # unit tests only (seconds, mocked LLM)
```

Live end-to-end runs against `npm run dev` manually (burns real model
tokens, ~2 minutes for BONK).

## Known Limits

- **Vercel Hobby 300s ceiling:** every layer is far under it; the browser
  chains them so total wall time can exceed it safely.
- **CoinGecko public-tier rate limits:** unauthenticated calls throttle
  (HTTP 429); fetchers degrade to error strings analysts handle honestly.
- **Reasoning-model latency:** Vercel runs use fast `mimo-v2.5`; the pro
  reasoning model stays local-only.
- **Thin data for new tokens:** low liquidity and short history make signals
  unreliable. Gaps render as MISSING with lower confidence.
- **Wallet is demo-grade:** address from localStorage, history endpoint trusts
  the query param. No signature auth — do not treat as identity.

## Vercel Deploy

1. Connect the repo (framework preset Next.js, defaults).
2. Add env vars: `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL=mimo-v2.5`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://<domain>`,
   `CHAIN_SECRET=<random-32-chars>`. Upstash vars optional (rate limit).
3. Every push rebuilds and publishes.
