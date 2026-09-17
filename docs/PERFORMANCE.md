# Performance

Lighthouse, run against a production build (`next start`) on the local stack,
headless Chrome, default mobile throttling. Target: **≥ 90** for performance,
accessibility and best practices.

| Page | Perf | A11y | Best practices | LCP | TBT | CLS |
| ---- | ---- | ---- | -------------- | --- | --- | --- |
| `/` | **97** | **100** | **100** | 2.4 s | 110 ms | 0 |
| `/verify/[id]` | **91** | **100** | **100** | 2.8 s | 200 ms | 0.028 |
| `/login` | **100** | **100** | **100** | 1.6 s | 50 ms | 0.012 |
| `/verify/upload` | **93** | **100** | **100** | 2.6 s | 210 ms | 0 |
| `/scan` | **99** | **100** | **100** | 1.8 s | 70 ms | 0 |

All pages meet the target.

## What moved the numbers

The landing page first scored **75**. Two things were wrong, both of them the
same mistake in different places: shipping JavaScript to pages that did not
need any.

**1. The lookup form was a client component.** It used `useRouter` and
`useState` to push a route on submit — which meant the most-visited page in the
system downloaded and hydrated React to do what a plain HTML form does for
free. It is now an ordinary `<form action="/verify" method="get">`, with a
small `/verify` route that redirects to `/verify/<id>`. No hydration, and it
still works with JavaScript disabled.

**2. The toast component was mounted in the root layout.** Only dashboard
actions ever raise a toast, but `sonner` was being shipped to every public
page. It now mounts in the dashboard layout instead.

Result: `/` went **75 → 97**. LCP 3.5s → well under the threshold, TBT 470ms →
negligible. CLS was 0 throughout, which is what `next/font` self-hosting buys —
no late webfont swap, no layout shift.

## Bundle

| | gzipped |
| --- | --- |
| Shared baseline (React 19 + Next 16 runtime) | 127 kB |
| All chunks combined | 322 kB |
| QR scanner, isolated chunk | 55 kB |

The scanner is behind `next/dynamic` with `ssr: false` and only loads when a
visitor presses "Start camera" on `/scan`. `pdf-lib`, the viem wallet client
and `nodemailer` are all `server-only` and never reach the browser.

## Method

```bash
npm run build && npm run start
CHROME_PATH=... npx lighthouse http://localhost:3000/ \
  --only-categories=performance,accessibility,best-practices
```

Raw reports are in `docs/lighthouse/*.json`.
