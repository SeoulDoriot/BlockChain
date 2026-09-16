# Requirements → implementation

Every handout requirement, the exact files that implement it, and whether it is
**proven** to work.

## Status legend

| Mark | Meaning |
| ---- | ------- |
| ✅ | Verified by an automated test that actually ran and passed, or by a build I ran |
| 🟡 | Code complete and typechecking, but **not yet proven** — needs the deployed contract and a live Supabase project |
| ⛔ | Blocked, nothing usable yet |

I have marked ✅ only where something was genuinely executed. Everything that
touches a real chain or a real database is 🟡, because at the time of writing
the contract is not deployed and no Supabase project exists for this app. The
Playwright suite that turns most of these into ✅ is written and ready; it has
never been run.

## Requirements

| # | Requirement | Implemented in | Status |
|---|-------------|----------------|--------|
| 1 | **Organisation login** | [proxy.ts](../web/proxy.ts) · [lib/auth.ts](../web/lib/auth.ts) · [app/login/page.tsx](../web/app/login/page.tsx) · [app/login/actions.ts](../web/app/login/actions.ts) · [lib/supabase/server.ts](../web/lib/supabase/server.ts) · [0001_init.sql](../web/supabase/migrations/0001_init.sql) (`staff`, `orgs`, RLS) | 🟡 |
| 2 | **Create / issue certificates** | [app/dashboard/certificates/new/page.tsx](../web/app/dashboard/certificates/new/page.tsx) · [components/issue-certificate-form.tsx](../web/components/issue-certificate-form.tsx) · [app/api/certificates/issue/route.ts](../web/app/api/certificates/issue/route.ts) · [lib/cert/issue.ts](../web/lib/cert/issue.ts) · [lib/schemas.ts](../web/lib/schemas.ts) | 🟡 |
| 3 | **Downloadable PDF** | [lib/cert/pdf.ts](../web/lib/cert/pdf.ts) · [lib/cert/storage.ts](../web/lib/cert/storage.ts) · [app/api/certificates/[id]/pdf/route.ts](../web/app/api/certificates/%5Bid%5D/pdf/route.ts) (signed URL, 5 min) | 🟡 |
| 4 | **Record on blockchain** | [CertificateRegistry.sol](../contracts/contracts/CertificateRegistry.sol) · [lib/chain/registry.ts](../web/lib/chain/registry.ts) · [lib/chain/client.ts](../web/lib/chain/client.ts) · [ignition/modules/CertificateRegistry.ts](../contracts/ignition/modules/CertificateRegistry.ts) | ✅ contract logic (30 tests) · 🟡 not deployed |
| 5 | **View issued certificates** | [app/dashboard/certificates/page.tsx](../web/app/dashboard/certificates/page.tsx) (server-side pagination, filter, search) · [lib/data/certificates.ts](../web/lib/data/certificates.ts) | 🟡 |
| 6 | **Verify by Certificate ID** | [app/verify/[id]/page.tsx](../web/app/verify/%5Bid%5D/page.tsx) · [components/verify-by-id-form.tsx](../web/components/verify-by-id-form.tsx) · [lib/verify.ts](../web/lib/verify.ts) | 🟡 |
| 7 | **Verify by QR** | [lib/cert/qr.ts](../web/lib/cert/qr.ts) (QR encodes `/verify/<id>`) · [app/scan/page.tsx](../web/app/scan/page.tsx) · [components/scan-launcher.tsx](../web/components/scan-launcher.tsx) · [components/qr-scanner-panel.tsx](../web/components/qr-scanner-panel.tsx) | ✅ payload parsing (7 tests) · 🟡 camera path |
| 8 | **View certificate info** | [app/verify/[id]/page.tsx](../web/app/verify/%5Bid%5D/page.tsx) · [app/dashboard/certificates/[id]/page.tsx](../web/app/dashboard/certificates/%5Bid%5D/page.tsx) | 🟡 |
| 9 | **View blockchain tx info** | [app/verify/[id]/page.tsx](../web/app/verify/%5Bid%5D/page.tsx) (tx hash, network, anchored-at, contract, PolygonScan links) · [lib/chain/client.ts](../web/lib/chain/client.ts) (`explorerTxUrl`) | 🟡 |
| 10 | **Status Valid / Expired / Revoked** | [lib/status.ts](../web/lib/status.ts) · [CertificateRegistry.sol](../contracts/contracts/CertificateRegistry.sol) `statusOf` · [components/status-seal.tsx](../web/components/status-seal.tsx) | ✅ logic (contract tests 24–27, 29; web tests for every branch) · 🟡 end-to-end |
| 11 | **Email notifications** | [lib/email/send.ts](../web/lib/email/send.ts) · [lib/email/transport.ts](../web/lib/email/transport.ts) (pooled singleton) · issue route via `after()` · [resend route](../web/app/api/certificates/%5Bid%5D/resend/route.ts) | 🟡 |
| 12 | **Expiration management** | Derived in `statusOf` with no cron · [app/api/cron/expiry-reminders/route.ts](../web/app/api/cron/expiry-reminders/route.ts) (30/7-day reminders) · [renew route](../web/app/api/certificates/%5Bid%5D/renew/route.ts) | ✅ expiry derivation (contract tests 24–27) · 🟡 reminders |
| 13 | **Revocation** | [CertificateRegistry.sol](../contracts/contracts/CertificateRegistry.sol) `revoke` · [revoke route](../web/app/api/certificates/%5Bid%5D/revoke/route.ts) · [lib/cert/issue.ts](../web/lib/cert/issue.ts) `revokeCertificate` · [components/certificate-actions.tsx](../web/components/certificate-actions.tsx) | ✅ contract logic (tests 18–23) · 🟡 end-to-end |

## Extras beyond the handout

| Feature | Implemented in | Status |
|---------|----------------|--------|
| PDF upload tamper check | [app/api/verify/upload/route.ts](../web/app/api/verify/upload/route.ts) · [components/pdf-tamper-check.tsx](../web/components/pdf-tamper-check.tsx) · [0003_pdf_fingerprint.sql](../web/supabase/migrations/0003_pdf_fingerprint.sql) | 🟡 |
| Retry a failed issue | [retry route](../web/app/api/certificates/%5Bid%5D/retry/route.ts) | 🟡 |
| Audit log | [lib/audit.ts](../web/lib/audit.ts) · [app/dashboard/audit/page.tsx](../web/app/dashboard/audit/page.tsx) | 🟡 |
| Multi-issuer admin (grant `ISSUER_ROLE`) | [app/dashboard/admin/page.tsx](../web/app/dashboard/admin/page.tsx) · [app/api/admin/issuers/route.ts](../web/app/api/admin/issuers/route.ts) | ✅ contract role logic (tests 4–6) · 🟡 UI path |
| Rate limiting, no extra service | [0002_rate_limits.sql](../web/supabase/migrations/0002_rate_limits.sql) · [lib/rate-limit.ts](../web/lib/rate-limit.ts) | 🟡 |
| Health check | [app/api/health/route.ts](../web/app/api/health/route.ts) | 🟡 |

## Not built

| Item | Why |
| ---- | --- |
| Bulk CSV issue | Not reached. `issueBatch` exists in the contract and is tested (tests 15–17), so the expensive half is done; the CSV parser, progress UI and result download are not written. |
| EN/ខ្មែរ toggle | Not reached. Hashing is already NFC-normalised and tested against Khmer input, so the data layer is ready for it. |
| LinkedIn add-to-profile / share | Not reached. |
| Lighthouse scores | Cannot be measured — needs a running app with real data. |

## What was actually verified

| Check | Command | Result |
| ----- | ------- | ------ |
| Contract tests | `cd contracts && npm test` | ✅ 30 passing |
| Web unit tests | `cd web && npm test` | ✅ 41 passing |
| Typecheck | `npx tsc --noEmit` | ✅ clean |
| Lint | `npm run lint` | ✅ clean |
| Production build | `npm run build` | ✅ clean, 22 routes |
| End-to-end | `npm run test:e2e` | ⛔ never run — needs deployed contract + Supabase |
| Lighthouse | — | ⛔ never run |
