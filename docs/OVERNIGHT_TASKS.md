# OVERNIGHT TASKS — CertChain KH
Work top to bottom. Tick `- [x]` only when a task truly works and its checks pass.
If a task is blocked by something only Dorito can do, write it in docs/BLOCKERS.md, leave the box unticked, and move on.
Full project spec: CLAUDE.md. Available settings are exported from web/.env.local. Some credentials may be missing; record those blockers and continue independent coding tasks.

## A. Environment, database, contract
- [x] A1. Audit the repo vs CLAUDE.md: list what exists, what's missing, and any mock/placeholder/TODO code → docs/PROGRESS_LOG.md
- [ ] A2. Add a chain switch: `NEXT_PUBLIC_CHAIN=local|amoy`. Local = Hardhat node on 127.0.0.1:8545 with the contract deployed there by a script. All automated tests use LOCAL (fast + saves test POL). Amoy is used only for the real app and one final e2e run.
- [ ] A3. CREATE THE DATABASE: apply web/supabase/migrations (CLAUDE.md §7, improved if needed) to Supabase using `npx supabase db push --db-url "$SUPABASE_DB_URL"` (fallback: a node script with the `pg` package). Verify every table, function, index and RLS policy exists by querying the DB.
- [ ] A4. Create the private storage bucket `certificates` with the admin client (idempotent script).
- [ ] A5. Seed script (idempotent): create the auth user ADMIN_EMAIL / ADMIN_PASSWORD with the admin API if missing, org KIT "Kirirom Institute of Technology", admin staff row, 3 courses (one with no expiry). Run it.
- [ ] A6. Deploy CertificateRegistry to Amoy with Ignition (AMOY_PRIVATE_KEY + AMOY_RPC_URL are exported) if not already deployed. Check the wallet POL balance first; if it's too low, log a blocker. Verify on PolygonScan (Etherscan V2 key). Export the ABI. Write NEXT_PUBLIC_CONTRACT_ADDRESS into web/.env.local and README.
- [x] A7. Contract tests: all tests from CLAUDE.md §5 pass (`npx hardhat test`).

## B. Backend + logic (CLAUDE.md §6, §8, §9, §10)
- [ ] B1. lib/chain (hash, client with batch http transport, registry with receipt waits + friendly error decoding + underpriced retry). Singletons, server-only.
- [ ] B2. PDF generator (pdf-lib, A4 landscape, QR, seal-style design) + sample output script.
- [ ] B3. Mail transport + 4 templates (issued, revoked, expiring soon, renewed). Emails sent with `after()` so responses stay fast; failures logged, never fatal.
- [ ] B4. Issue service + POST /api/certificates (full flow in CLAUDE.md §8, maxDuration 60).
- [ ] B5. Revoke, renew, retry, resend-email services + routes. Every chain action → blockchain_txs; every staff action → audit_logs. Revalidate verify cache tags on change.
- [ ] B6. Verify service + GET /api/verify/[certCode] (Promise.all for DB + chain, whitelisted fields, statuses VALID/EXPIRED/REVOKED/TAMPERED/NOT_ON_CHAIN/NOT_FOUND, short cache with tags).
- [ ] B7. PDF upload authenticity check (POST /api/verify/upload, SHA-256 compare).
- [ ] B8. List/detail/stats/health routes, server-side pagination, one-query relations, needed columns only.
- [ ] B9. Bulk CSV issue (sequential, progress), expiry-reminder cron route + vercel.json, rate limiting on public routes (DB-backed, no paid services).
- [ ] B10. Security pass: every protected route calls requireStaff(); zod on every input; no server-only import reachable from client code; no secrets in the repo.

## C. Backend QA (all automated, against LOCAL chain)
- [ ] C1. Vitest unit tests: hashing, status mapping, zod schemas, cert code format, expiry calculation, error decoding.
- [ ] C2. Integration tests for services (local Hardhat node + real Supabase, test data prefixed TEST- and cleaned up after).
- [ ] C3. API tests for every route: auth required, validation errors, happy paths, rate limit.
- [ ] C4. Scenario test: issue → VALID → tamper name in DB → TAMPERED → restore → revoke → REVOKED → short-expiry cert → EXPIRED → renew → VALID → upload real PDF → match → upload edited PDF → no match.
- [ ] C5. `npm run typecheck`, `npm run lint`, all tests green. Fix root causes, never skip or delete tests to make them pass.

## D. Frontend build (design spec below)
- [ ] D1. Design system: tokens in CSS variables, light + dark, fonts via next/font, shadcn/ui, motion (fast, respects reduced motion), EN/ខ្មែរ dictionary.
- [ ] D2. Shared components: StatusBadge, StatusBanner, BlockchainProofPanel, TxTimeline, TxLink, HashCompare, CertificatePreview, QrScannerDialog (dynamic import), IssueStepper, EmptyState, CopyButton, CommandPalette (cmdk).
- [ ] D3. Public: Landing, /verify (tabs: ID / Scan QR / Upload PDF), /verify/[certCode] result page.
- [ ] D4. Staff: Login, Dashboard, Issue (live preview + real stepper), Bulk issue, Certificates table, Certificate detail (tabs), Courses, Audit log, Issuer wallets.
- [ ] D5. Every page: loading.tsx skeletons, error.tsx, empty states, toasts, full keyboard support, aria labels.
- [ ] D6. No mock data anywhere; every screen uses real API/DB data.

## E. Design review loop (repeat until the scores hold)
- [ ] E1. Playwright script `npm run screenshots`: every page × (desktop 1440, mobile 390) × (light, dark), logged-in and logged-out, including all verify statuses → docs/screenshots/.
- [ ] E2. Review round 1: open EVERY screenshot with the Read tool. Score each page 1–10 on hierarchy, spacing/alignment, typography, color/contrast, consistency, mobile layout, polish. Write the issues in docs/DESIGN_REVIEW.md. Fix them all.
- [ ] E3. Review round 2: re-shoot, re-read, re-score, fix.
- [ ] E4. Review round 3: every page must score ≥ 8. Keep looping (max 3 extra rounds) until it does.

## F. Performance
- [ ] F1. `next build`: record route sizes; lazy-load heavy client code; Server Components by default; nothing heavy shipped to the browser.
- [ ] F2. Lighthouse (npx lighthouse on `next start`, headless Chrome; use Playwright's Chromium via CHROME_PATH if needed) on /, /verify, /verify/[code], /login: Performance, Accessibility, Best Practices ≥ 90. Fix and re-run. Save scores in docs/PERFORMANCE.md.
- [ ] F3. Verify API p95 < 800ms locally with caching (measure with a small script, record in PERFORMANCE.md).

## G. Final QA
- [ ] G1. Playwright e2e for all user flows (local chain): login, issue, list, detail, revoke, renew, resend, bulk, verify by ID, QR route, upload check, language toggle, dark mode, mobile nav.
- [ ] G2. ONE real run against Amoy: issue → verify → revoke → verify. Save the PolygonScan links in docs/PROGRESS_LOG.md.
- [ ] G3. Everything green: contract tests, unit, integration, API, e2e, typecheck, lint, build.

## H. Docs for submission
- [ ] H1. docs/REQUIREMENTS.md: every handout requirement (CLAUDE.md §1) → files that implement it → test that proves it → ✅.
- [ ] H2. docs/EXPLAIN.md complete (plain English + lecturer Q&A per area).
- [ ] H3. README: setup, env table, scripts, contract address + PolygonScan link, architecture, screenshots.
- [ ] H4. docs/diagrams (Mermaid: architecture, issue/verify/revoke/expiry flows, ER from the real schema, blockchain architecture) + docs/REPORT.md with all 11 required sections + docs/DEMO_SCRIPT.md.
- [ ] H5. Final review against CLAUDE.md §16. Then create the file `.overnight-done`.

---
## DESIGN SPEC (used by D and E)
Concept "Digital notary": official, trustworthy, modern — a government-grade credential meets a clean Apple-style product page.
- Colors: ink navy #0B1F3A (primary), seal gold #C9A227 (accent, sparingly), paper #FAF8F3 (light bg), deep #070F1E (dark bg). Status: Valid emerald, Expired amber, Revoked rose, Tampered/Not found slate.
- Type: Inter (UI), Fraunces (certificate + hero headings), Kantumruy Pro (Khmer), JetBrains Mono (hashes/addresses).
- 8px grid, generous whitespace, 16px radius cards, subtle borders over heavy shadows, 150–250ms motion.
- Landing: split hero. Left: "Certificates you can prove." + big verify input + Scan QR button. Right: animated certificate that "verifies itself" (hash lines → gold seal check). Below: how-it-works (3 steps), live stats strip from the DB, "Why blockchain", footer with contract link.
- Verify result: mobile-first. Big status banner (animated check for Valid; clear red with reason and date for Revoked). Certificate card that looks like the real PDF with a holographic gold seal. Blockchain proof panel: network, contract, issuer, tx timeline with PolygonScan links, on-chain vs computed hash with copy buttons and ✓/✗. Buttons: download PDF, share, add to LinkedIn. "Last checked" time.
- Login: split screen (brand panel + form).
- Dashboard: collapsible sidebar, top bar with search + ⌘K palette, stat cards with sparklines, activity feed, wallet card (address, POL balance, low-balance warning).
- Issue: form left, live certificate preview right; submit shows a real stepper (Saving → Recording on blockchain → Generating PDF → Done) then a success screen with tx link, verify link, "Issue another".
- Certificates table: sticky header, search, status filter chips, sort, pagination, row → detail.
- Detail: header with status + actions (Revoke dialog with required reason, Renew date picker, Resend email); tabs Overview / PDF / Blockchain / Emails / Audit.
- Responsive at 375 / 768 / 1440 with no layout shift. WCAG AA contrast.
