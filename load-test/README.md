# Load Testing — StudBridge Kids Server

Load tests use [autocannon](https://github.com/mcollina/autocannon) (HTTP benchmarking).
Selenium is **not** used here — Selenium drives a real browser and is meant for UI/E2E
testing, not for measuring backend throughput / concurrent-user capacity.

## Install

```bash
npm install            # autocannon is already in devDependencies
```

## Run

Generic runner (any URL / method / body):

```bash
# Raw server capacity (no DB) — production
node load-test/loadtest.js --url https://studbridge-kids-server.onrender.com/health -c 100 -d 20

# Local
node load-test/loadtest.js --url http://localhost:5000/health -c 100 -d 20

# A DB + auth endpoint (POST)
node load-test/loadtest.js \
  --url https://studbridge-kids-server.onrender.com/api/auth/login \
  --method POST \
  --body "{\"identifier\":\"x@x.com\",\"password\":\"x\",\"school_id\":1}" \
  -c 20 -d 15
```

Flags: `--url`, `--method`, `--body`, `--headers`, `-c` connections (virtual users),
`-d` duration (s), `-p` pipelining.

## Results (production, Render — Jun 2026)

`/health` endpoint (no DB, no rate limit) — raw server capacity:

| Connections | Req/s (avg) | Req/s (max) | Latency avg | Latency p99 | Errors |
|------------:|------------:|------------:|------------:|------------:|-------:|
| 50          | 207         | 247         | 241 ms      | 927 ms      | 0      |
| 100         | 343         | 447         | 290 ms      | 1601 ms     | 0      |
| 200         | 346         | 465         | 573 ms      | 4584 ms     | 0      |

**Saturation point ≈ 100 concurrent connections / ~345 req/s.** Beyond that,
throughput stops rising and latency balloons (p99 > 4.5 s at 200).

`/api/auth/login` (DB lookup + bcrypt, rate-limited) — 20 conn / 15 s:
- ~72 req/s, all non-2xx (mix of 401 invalid creds + 429 rate-limit).
- The per-IP rate limiter (`apiLimiter` 1100 / 15 min, `authLimiter` 110 / 15 min)
  is the first wall a single client hits.

## Interpreting "how many users"

- Raw lightweight capacity: ~345 req/s.
- A typical active user sends ~1 request every 3–5 s of browsing.
  → 345 req/s × 4 s think-time ≈ **~1,000–1,400 concurrent active users** for
    light/cached endpoints.
- DB-heavy endpoints are bounded by the Postgres pool (`max: 10` in `src/config/db.js`)
  and the Supabase pooler, so sustained heavy traffic is far lower than the raw number.

## Bottlenecks to address before scaling

1. **DB pool size** — `max: 10` connections (`src/config/db.js`). Raise carefully and
   confirm the Supabase plan allows more pooled connections.
2. **Single Render instance** — scale horizontally (more instances) for >~345 req/s.
3. **Rate limiter** — per-IP limits will block legitimate bursts; tune for real traffic.
4. **bcrypt cost** on login is CPU-heavy; it caps auth throughput per instance.
