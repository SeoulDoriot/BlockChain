# Requirements → implementation

Every handout requirement, the exact files that implement it, and whether it is
**proven** to work.

## Status legend

| Mark | Meaning |
| ---- | ------- |
| ✅ | Proven by an automated test that ran and passed against a real chain and a real database |
| 🟢 | Proven working locally, but not yet exercised on the public Amoy testnet |
| 🟡 | Code complete, not yet proven |
| ⛔ | Blocked |

Everything below was verified against a **local stack**: Supabase running in
Docker (Postgres + Auth + Storage + Mailpit) and the `CertificateRegistry`
deployed to a Hardhat node at `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
This is a real database, a real chain, real SMTP and real PDFs — not mocks. The
one thing still unproven is the public Amoy deployment, which needs credentials
only the owner can supply.

I have marked ✅ only where something was genuinely executed. Everything that
touches a real chain or a real database is 🟡, because at the time of writing
the contract is not deployed and no Supabase project exists for this app. The
Playwright suite that turns most of these into ✅ is written and ready; it has
never been run.

## Requirements

| # | Requirement | Implemented in | Status |
|---|-------------|----------------|--------|
| 1 | **Organisation login** | [proxy.ts](../web/proxy.ts) · [lib/auth.ts](../web/lib/auth.ts) · [app/login/](../web/app/login/) · [0001_init.sql](../web/supabase/migrations/0001_init.sql) | ✅ e2e signs in and is redirected; `/dashboard` → `/login?next=` when signed out |
| 2 | **Create / issue certificates** | [app/api/certificates/issue/route.ts](../web/app/api/certificates/issue/route.ts) · [lib/cert/issue.ts](../web/lib/cert/issue.ts) · [components/issue-certificate-form.tsx](../web/components/issue-certificate-form.tsx) | ✅ e2e test 1; 7 certificates issued end to end |
| 3 | **Downloadable PDF** | [lib/cert/pdf.ts](../web/lib/cert/pdf.ts) · [lib/cert/storage.ts](../web/lib/cert/storage.ts) · [pdf route](../web/app/api/certificates/%5Bid%5D/pdf/route.ts) | ✅ 18,731-byte PDF generated, stored in the private bucket, downloaded via signed URL |
| 4 | **Record on blockchain** | [CertificateRegistry.sol](../contracts/contracts/CertificateRegistry.sol) · [lib/chain/registry.ts](../web/lib/chain/registry.ts) | ✅ locally (30 contract tests + every e2e issue waits for a real receipt) · 🟢 not on Amoy |
| 5 | **View issued certificates** | [app/dashboard/certificates/page.tsx](../web/app/dashboard/certificates/page.tsx) · [lib/data/certificates.ts](../web/lib/data/certificates.ts) | ✅ list renders real rows with server-side pagination |
| 6 | **Verify by Certificate ID** | [app/verify/[id]/page.tsx](../web/app/verify/%5Bid%5D/page.tsx) · [lib/verify.ts](../web/lib/verify.ts) | ✅ e2e tests 1, 4, 5, 6, 8 |
| 7 | **Verify by QR** | [lib/cert/qr.ts](../web/lib/cert/qr.ts) · [components/scan-launcher.tsx](../web/components/scan-launcher.tsx) | ✅ QR route opens the verify page (e2e test 7) + 7 unit tests · 🟡 physical camera scan untested |
| 8 | **View certificate info** | [verify page](../web/app/verify/%5Bid%5D/page.tsx) · [detail page](../web/app/dashboard/certificates/%5Bid%5D/page.tsx) | ✅ recipient, course, issuer, dates all render |
| 9 | **View blockchain tx info** | [verify page](../web/app/verify/%5Bid%5D/page.tsx) · [lib/chain/client.ts](../web/lib/chain/client.ts) | ✅ e2e test 2 — tx hash, network, anchored-at, contract, anchored vs recomputed hash |
| 10 | **Status Valid / Expired / Revoked** | [lib/status.ts](../web/lib/status.ts) · [contract `statusOf`](../contracts/contracts/CertificateRegistry.sol) · [components/status-seal.tsx](../web/components/status-seal.tsx) | ✅ all four states proven end to end, including **Tampered** |
| 11 | **Email notifications** | [lib/email/send.ts](../web/lib/email/send.ts) · [lib/email/transport.ts](../web/lib/email/transport.ts) | ✅ 7 emails delivered with PDF attachments, sent via `after()` |
| 12 | **Expiration management** | contract `statusOf` (no cron) · [cron route](../web/app/api/cron/expiry-reminders/route.ts) · [renew route](../web/app/api/certificates/%5Bid%5D/renew/route.ts) | ✅ expiry proven by advancing the chain clock (e2e test 6); renewal issues a fresh valid certificate · 🟡 reminder emails |
| 13 | **Revocation** | contract `revoke` · [revoke route](../web/app/api/certificates/%5Bid%5D/revoke/route.ts) | ✅ e2e test 5 — revokes on-chain and the public page stops saying Valid immediately |

## Extras beyond the handout

| Feature | Implemented in | Status |
|---------|----------------|--------|
| PDF upload tamper check | [app/api/verify/upload/route.ts](../web/app/api/verify/upload/route.ts) · [components/pdf-tamper-check.tsx](../web/components/pdf-tamper-check.tsx) · [0003_pdf_fingerprint.sql](../web/supabase/migrations/0003_pdf_fingerprint.sql) | ✅ genuine → match, one byte flipped → tampered, non-PDF → rejected |
| Retry a failed issue | [retry route](../web/app/api/certificates/%5Bid%5D/retry/route.ts) | 🟡 |
| Audit log | [lib/audit.ts](../web/lib/audit.ts) · [app/dashboard/audit/page.tsx](../web/app/dashboard/audit/page.tsx) | ✅ 16 entries recorded across issue / email / revoke / renew |
| Multi-issuer admin (grant `ISSUER_ROLE`) | [app/dashboard/admin/page.tsx](../web/app/dashboard/admin/page.tsx) · [app/api/admin/issuers/route.ts](../web/app/api/admin/issuers/route.ts) | ✅ contract role logic (tests 4–6) · 🟡 UI path |
| Rate limiting, no extra service | [0002_rate_limits.sql](../web/supabase/migrations/0002_rate_limits.sql) · [lib/rate-limit.ts](../web/lib/rate-limit.ts) | 🟡 |
| Bulk CSV issue | [components/bulk-issue.tsx](../web/components/bulk-issue.tsx) · [lib/csv.ts](../web/lib/csv.ts) · [bulk page](../web/app/dashboard/certificates/bulk/page.tsx) | ✅ 3 e2e tests + 23 parser unit tests |
| EN / ខ្មែរ toggle | [lib/i18n.ts](../web/lib/i18n.ts) · [components/locale-toggle.tsx](../web/components/locale-toggle.tsx) | ✅ e2e, including with JavaScript disabled |
| LinkedIn add-to-profile + share | [components/share-certificate.tsx](../web/components/share-certificate.tsx) | ✅ e2e asserts the deep link carries no personal data |
| Works without JavaScript | public pages render blocking | ✅ 3 e2e tests run with `javaScriptEnabled: false` |
| Health check | [app/api/health/route.ts](../web/app/api/health/route.ts) | ✅ returns 200 with database, RPC and contract-bytecode all green |

## Not built

| Item | Why |
| ---- | --- |
| Amoy deployment + PolygonScan verification | Needs an RPC URL, a funded deployer key and an Etherscan key. Everything it would exercise is already proven on the local chain. |

## What was actually verified

| Check | Command | Result |
| ----- | ------- | ------ |
| Contract tests | `cd contracts && npm test` | ✅ 30 passing |
| Web unit tests | `cd web && npm test` | ✅ 64 passing |
| Typecheck | `npx tsc --noEmit` | ✅ clean |
| Lint | `npm run lint` | ✅ clean |
| Production build | `npm run build` | ✅ clean, 22 routes |
| End-to-end | `npm run test:e2e` | ✅ **14 passing** against local Supabase + Hardhat chain |
| Migrations | `supabase db reset` | ✅ all 3 applied; 6 tables, RLS on all, 10 policies, 5 functions, private bucket, 8 indexes |
| Email delivery | Mailpit | ✅ 7 messages with PDF attachments |
| Lighthouse | `npx lighthouse` | ✅ **93–99 perf, 100 a11y, 100 best practices** on all 5 public pages — see [PERFORMANCE.md](PERFORMANCE.md) |
| Amoy deployment | — | ⛔ needs owner credentials |
