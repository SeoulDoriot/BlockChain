# Certify — Blockchain-Anchored Certificate Verification

A certificate issuing and verification platform for **Kirirom Institute of
Technology (KIT)**.

Staff issue a certificate to a student. The system generates a PDF with a QR
code, records a cryptographic fingerprint (hash) of the certificate on a
blockchain, and emails the PDF to the recipient. Anyone — an employer, another
university — can scan the QR code or type the certificate ID to confirm it is
genuine, **without an account and without having to trust KIT's servers**.

The point is **tamper-evidence**: change a single character of a certificate
and its fingerprint no longer matches the one on-chain, so verification fails.

## Features

- **Organisation login** for staff (Supabase Auth, row-level security per organisation)
- **Issue certificates** one at a time or in bulk from a CSV, with a live preview and a confirmation step
- **PDF certificate** with QR code, certificate ID, signatory name/title and signature image
- **On-chain anchoring** of a keccak-256 hash — no personal data ever goes on-chain
- **Public verification** by certificate ID, QR scan, or uploading the PDF itself
- **Status**: Valid · Expired · Revoked · Tampered · Not on chain — the blockchain is authoritative
- **Revocation** (recorded on-chain, permanent) and **renewal** (issues a new certificate)
- **Expiry** derived at read time by the contract — no cron job needed
- **Courses** and **signatory** management; **audit log**; **multi-issuer** wallet roles
- **Email delivery** of the PDF; English / ខ្មែរ toggle; works without JavaScript on public pages

## Architecture

| Piece        | Technology                       | Holds |
| ------------ | -------------------------------- | ----- |
| `contracts/` | Solidity 0.8.28, Hardhat 3, OpenZeppelin `AccessControl` | Certificate hashes and status flags. **No personal data.** |
| `web/`       | Next.js 16 (App Router), React 19, Tailwind CSS 4, viem | Staff dashboard and the public verification pages |
| Supabase     | Postgres + Auth + Storage        | Certificate records, PDFs (private bucket), staff accounts |

```
Issue:   staff form → row (draft) → canonical payload → keccak256 → issue() on-chain
         → PDF with QR → private storage → row (issued) → email to recipient

Verify:  scan QR / enter ID → look up row → recompute hash → statusOf(hash) on-chain
         → Valid / Expired / Revoked / Tampered
```

Full design notes: [CLAUDE.md](CLAUDE.md) (spec) and [docs/EXPLAIN.md](docs/EXPLAIN.md).

## Running it locally

**Requirements:** Node.js 22.13+, npm, Docker Desktop, the Supabase CLI.

```bash
# 1. Install
cd contracts && npm install && cd ../web && npm install

# 2. Configure — copy the template, then fill it in (see comments inside)
cp .env.example .env.local
#    For a fully local stack set NEXT_PUBLIC_CHAIN=local and RPC_URL=http://127.0.0.1:8545,
#    and use the Supabase URL and keys printed by `supabase status`.

# 3. Start Supabase (Postgres, Auth, Storage, Mailpit) and apply migrations
npm run local:up

# 4. In a second terminal: start a local blockchain
npm run local:chain

# 5. Deploy the contract and export its ABI to the web app
npm run local:deploy        # put the printed address in NEXT_PUBLIC_CONTRACT_ADDRESS

# 6. Create the admin account and seed sample courses
npm run local:seed

# 7. Run the app
npm run dev                 # http://localhost:3000
```

The local Hardhat chain keeps no state between restarts. After restarting it,
redeploy (step 5) and re-record existing certificates with
`npm run local:reanchor`.

## Tests

| Suite | Command | Result |
| ----- | ------- | ------ |
| Smart contract | `cd contracts && npm test` | 30 passing |
| Web unit (Vitest) | `cd web && npm test` | 89 passing |
| End-to-end (Playwright, real DB + chain) | `cd web && npm run test:e2e` | 14 passing |
| Typecheck / lint | `npx tsc --noEmit` · `npm run lint` | clean |

## Security

- Only a 32-byte hash and timestamps are written on-chain — never names, emails or grades.
- Row-level security on every table; staff can only see their own organisation's data.
- The Supabase service-role key and the signing key are server-only and never reach the browser.
- PDFs live in a private bucket and are served only through short-lived signed URLs.
- Authorisation uses verified JWT claims (`getClaims()`), never the unverified session cookie.
- All input is validated with zod at the boundary; public endpoints are rate-limited.

## Documentation

- [docs/EXPLAIN.md](docs/EXPLAIN.md) — how the system works, in plain language
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — every requirement mapped to code and tests
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — Lighthouse results
- [docs/CONTRIBUTIONS.md](docs/CONTRIBUTIONS.md) — individual contribution report

## Author

Vy Seoul — Kirirom Institute of Technology. Built with the assistance of
Claude Code (Anthropic); see [docs/CONTRIBUTIONS.md](docs/CONTRIBUTIONS.md).
