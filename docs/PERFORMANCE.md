# Performance

Lighthouse against a production build (`next start`) on the local stack,
headless Chrome, default mobile throttling. Target: **≥ 90** for performance,
accessibility and best practices.

| Page | Perf | A11y | Best practices | LCP | TBT | CLS |
| ---- | ---- | ---- | -------------- | --- | --- | --- |
| `/` | **96** | **100** | **100** | 1.7 s | 210 ms | 0 |
| `/verify/[id]` | **97** | **100** | **100** | 2.5 s | 70 ms | 0 |
| `/login` | **99** | **100** | **100** | 1.8 s | 50 ms | 0.012 |
| `/verify/upload` | **93** | **100** | **100** | 2.2 s | 270 ms | 0 |
| `/scan` | **97** | **100** | **100** | 2.4 s | 150 ms | 0 |

Every page meets the target on all three categories.

## What moved the numbers

The landing page first scored **75**. Three fixes, and the third reversed an
assumption worth recording.

**1. The lookup form was a client component.** It used `useRouter` and
`useState` to push a route on submit — so the most-visited page in the system
downloaded and hydrated React to do what a plain HTML form does for free. It is
now `<form action="/verify" method="get">` with a small redirect route.

**2. The toaster was mounted in the root layout.** Only dashboard actions raise
a toast, but `sonner` shipped to every public page. It now mounts in the
dashboard layout.

**3. Streaming the verification result turned out to be slower, not faster.**
The result sat inside a Suspense boundary, which felt right — it waits on a
database and a chain read. But React delivers streamed content inside a
`<template>` that only JavaScript can swap in, which meant a visitor with
scripting disabled saw a skeleton instead of a verification result, on the one
page that has to work for anyone. Rendering it blocking fixed that **and
scored better**: 97 against 95, with a lower LCP, because the result lands in
the first paint rather than after a round trip.

Result: `/` went **75 → 96**, `/verify/[id]` to **97**. CLS is 0 everywhere,
which is what `next/font` self-hosting buys — no late webfont swap.

## Works without JavaScript

The public surface is covered by end-to-end tests that run with
`javaScriptEnabled: false`:

- the landing lookup form submits and returns a verification result
- the EN / ខ្មែរ toggle switches language and back
- the verification result itself renders

The QR scanner and the bulk-issue uploader genuinely need JavaScript, and say so.

## Bundle

| | gzipped |
| --- | --- |
| Shared baseline (React 19 + Next 16 runtime) | 127 kB |
| All chunks combined | 322 kB |
| QR scanner, isolated chunk | 55 kB |

The scanner is behind `next/dynamic` with `ssr: false` and loads only when a
visitor presses "Start camera". `pdf-lib`, the viem wallet client and
`nodemailer` are `server-only` and never reach the browser.

## Method

```bash
npm run build && npm run start
CHROME_PATH=... npx lighthouse http://localhost:3000/ \
  --only-categories=performance,accessibility,best-practices
```

Raw reports: `docs/lighthouse/*.json`.
