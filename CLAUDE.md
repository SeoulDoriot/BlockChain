# CLAUDE.md — Source of Truth

> **STATUS: APPROVED WORKING SPEC.** Reconstructed from the phase prompts and
> approved for build. Sections marked **[ASSUMPTION]** are agent-authored design
> decisions, not owner-specified requirements; revise them as the project learns.

These rules apply to every agent and engineer in this repository, in every
session. When a prompt says "follow §N exactly", it means the text below.

---

## §1 — What this project is

A blockchain-anchored certificate system for **KIT (Kirirom Institute of
Technology)**.

Staff issue a certificate to a student. The system generates a PDF carrying a QR
code, anchors a cryptographic hash of that certificate on a public blockchain,
and emails the PDF to the recipient. Anyone — an employer, another university —
can then scan the QR code and confirm the certificate is genuine, without an
account and without trusting KIT's servers.

The point is **tamper-evidence**, not secrecy. If a PDF is altered by one byte,
its hash no longer matches what is on-chain, and verification fails.

**[ASSUMPTION]** This is academic coursework, and a lecturer will assess it.
That is why `docs/EXPLAIN.md` carries plain-language explanations and Q&As.

---

## §2 — Architecture & data flow

Three pieces:

| Piece        | Technology                    | Holds                                     |
| ------------ | ----------------------------- | ----------------------------------------- |
| `contracts/` | Hardhat 3, Solidity 0.8.28    | Hashes and status flags. **No personal data.** |
| `web/`       | Next.js 16 (App Router)       | Dashboard for staff, public verify page    |
| Supabase     | Postgres + Auth + Storage     | Certificate records, PDFs, staff accounts  |

Issue flow:

```
staff fills form
  → row written to Supabase (status: draft)
  → canonical payload built (§3)
  → keccak256 → certHash
  → PDF rendered with QR pointing at /verify/<id>
  → PDF stored in private Supabase bucket
  → certHash written on-chain via CertificateRegistry.issue()
  → tx hash saved back to the row (status: issued)
  → email sent to recipient with PDF attached
```

Verify flow:

```
visitor scans QR → /verify/<id>
  → look up the row in Supabase (public-readable subset only)
  → recompute certHash from the stored fields
  → read statusOf(certHash) from the chain via viem
  → show: Active / Expired / Revoked / Not Found
```

**The chain is authoritative.** If Supabase says active and the chain says
revoked, the chain wins and the UI shows Revoked. Supabase is a cache and a
place to keep the human-readable data that must never go on-chain.

---

## §3 — Hashing spec

**[ASSUMPTION — this whole section is my design. Confirm or replace it.]**

The canonical payload is a UTF-8 string, fields joined by `|`, in exactly this
order, with no surrounding whitespace:

```
v1|<certificate_id>|<org_slug>|<course_code>|<recipient_name>|<recipient_email_lower>|<issued_on>|<expires_on>
```

Rules, all of which matter because both the issuer and the verifier must derive
the identical string:

- `v1` is a literal version prefix. Changing the payload shape means `v2`.
- `certificate_id` — the UUID of the Supabase row, lowercase.
- `org_slug` — e.g. `kit`.
- `course_code` — e.g. `CS101`.
- `recipient_name` — trimmed, internal whitespace collapsed to single spaces,
  Unicode NFC-normalised. Case preserved.
- `recipient_email_lower` — trimmed and lowercased.
- `issued_on` / `expires_on` — `YYYY-MM-DD`. If there is no expiry,
  `expires_on` is the empty string (the `|` separator still appears).

Then:

```ts
certHash = keccak256(toBytes(canonicalPayload))   // viem, bytes32
```

The email address is part of the hash but **never leaves the database** — a
verifier who already has the certificate can recompute it; a stranger reading
the chain sees only a 32-byte hash. `certHash` is the primary key on-chain.

---

## §4 — Engineering rules (non-negotiable)

1. **Never put personal data on-chain.** Names, emails, course titles, grades —
   none of it. Hashes and timestamps only. A public chain is permanent and
   worldwide; assume anything written is published forever.
2. **The service-role key is server-only.** It bypasses every RLS policy. Any
   module that touches it starts with `import "server-only"`. It is never
   prefixed `NEXT_PUBLIC_`, never imported into a client component, never
   logged.
3. **Never use `getSession()` for an authorisation decision.** It reads cookies
   without verifying them. Use `getClaims()` (verified) or `getUser()`.
4. **Secrets live in Hardhat's encrypted keystore**, not in `.env`, not in
   config files, not pasted into chat. Config reads them via `configVariable()`.
5. **RLS is on for every table.** No exceptions, no "temporarily off".
6. **Validate every input with zod at the boundary** — route handlers, server
   actions, env parsing.
7. **Small commits**, conventional prefixes (`feat:`, `test:`, `chore:`,
   `docs:`, `fix:`).
8. **Tests must actually pass before a commit claims they do.** Paste real
   output; never describe a run that did not happen.
9. **Deploy only when explicitly told.** Never deploy to a live network on your
   own initiative.
10. **Node 22.13+** (this machine runs v26.7.0). **npm** is the package manager.

---

## §5 — Smart contract spec

### 5.1 Source — `contracts/contracts/CertificateRegistry.sol`

**[ASSUMPTION — my design. This is the file Phase 1 will create verbatim.]**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CertificateRegistry
/// @notice Anchors certificate hashes on-chain. Stores no personal data.
contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum Status {
        Unknown,  // 0 — never issued
        Active,   // 1
        Expired,  // 2
        Revoked   // 3
    }

    struct Record {
        uint64 issuedAt;   // block timestamp at issue
        uint64 expiresAt;  // 0 == never expires
        bool revoked;
        address issuer;
    }

    mapping(bytes32 certHash => Record) private _records;

    event CertificateIssued(
        bytes32 indexed certHash,
        address indexed issuer,
        uint64 issuedAt,
        uint64 expiresAt
    );
    event CertificateRevoked(
        bytes32 indexed certHash,
        address indexed revokedBy,
        uint64 revokedAt,
        string reason
    );

    error InvalidAdmin();
    error InvalidCertHash();
    error InvalidExpiry(uint64 expiresAt);
    error CertificateAlreadyIssued(bytes32 certHash);
    error CertificateNotFound(bytes32 certHash);
    error CertificateAlreadyRevoked(bytes32 certHash);
    error LengthMismatch();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    /// @notice Anchor one certificate hash.
    /// @param expiresAt Unix seconds, or 0 for no expiry. Must be in the future.
    function issue(bytes32 certHash, uint64 expiresAt)
        external
        onlyRole(ISSUER_ROLE)
    {
        _issue(certHash, expiresAt);
    }

    /// @notice Anchor many hashes in one transaction.
    function issueBatch(bytes32[] calldata certHashes, uint64[] calldata expiries)
        external
        onlyRole(ISSUER_ROLE)
    {
        if (certHashes.length != expiries.length) revert LengthMismatch();
        for (uint256 i = 0; i < certHashes.length; ++i) {
            _issue(certHashes[i], expiries[i]);
        }
    }

    /// @notice Permanently mark a certificate revoked.
    function revoke(bytes32 certHash, string calldata reason)
        external
        onlyRole(ISSUER_ROLE)
    {
        Record storage r = _records[certHash];
        if (r.issuedAt == 0) revert CertificateNotFound(certHash);
        if (r.revoked) revert CertificateAlreadyRevoked(certHash);
        r.revoked = true;
        emit CertificateRevoked(certHash, msg.sender, uint64(block.timestamp), reason);
    }

    /// @notice Status derived at read time — no cron, no keeper.
    function statusOf(bytes32 certHash) public view returns (Status) {
        Record storage r = _records[certHash];
        if (r.issuedAt == 0) return Status.Unknown;
        if (r.revoked) return Status.Revoked;
        if (r.expiresAt != 0 && block.timestamp >= r.expiresAt) return Status.Expired;
        return Status.Active;
    }

    function isValid(bytes32 certHash) external view returns (bool) {
        return statusOf(certHash) == Status.Active;
    }

    function getRecord(bytes32 certHash) external view returns (Record memory) {
        Record memory r = _records[certHash];
        if (r.issuedAt == 0) revert CertificateNotFound(certHash);
        return r;
    }

    function _issue(bytes32 certHash, uint64 expiresAt) private {
        if (certHash == bytes32(0)) revert InvalidCertHash();
        if (_records[certHash].issuedAt != 0) revert CertificateAlreadyIssued(certHash);
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry(expiresAt);

        _records[certHash] = Record({
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revoked: false,
            issuer: msg.sender
        });

        emit CertificateIssued(certHash, msg.sender, uint64(block.timestamp), expiresAt);
    }
}
```

### 5.2 Required tests — `contracts/test/CertificateRegistry.ts`

`node:test` + `viem`, via `hardhat-toolbox-viem`. Time travel uses the network
helpers. Every one of these must pass:

**Deployment & roles**
1. Deploys and grants `DEFAULT_ADMIN_ROLE` to the constructor admin.
2. Deploys and grants `ISSUER_ROLE` to the constructor admin.
3. Reverts with `InvalidAdmin` when deployed with the zero address.
4. Admin can grant `ISSUER_ROLE` to another account.
5. Admin can revoke `ISSUER_ROLE`; the revoked account can no longer issue.
6. A non-admin calling `grantRole` reverts.

**Issuing**
7. `issue` stores the record and `statusOf` returns `Active`.
8. `issue` emits `CertificateIssued` with the right args.
9. `issue` records `msg.sender` as the issuer.
10. `issue` with `expiresAt == 0` is accepted and never expires.
11. Issuing the same hash twice reverts `CertificateAlreadyIssued`.
12. Issuing `bytes32(0)` reverts `InvalidCertHash`.
13. Issuing with an expiry in the past reverts `InvalidExpiry`.
14. A caller without `ISSUER_ROLE` reverts with the OZ unauthorised error.

**Batch**
15. `issueBatch` anchors every hash in the array.
16. `issueBatch` with mismatched array lengths reverts `LengthMismatch`.
17. `issueBatch` reverts entirely if any single entry is invalid (atomicity).

**Revocation**
18. `revoke` flips status to `Revoked`.
19. `revoke` emits `CertificateRevoked` with the reason string.
20. Revoking an unknown hash reverts `CertificateNotFound`.
21. Revoking twice reverts `CertificateAlreadyRevoked`.
22. A non-issuer calling `revoke` reverts.
23. A revoked certificate stays `Revoked` even after its expiry passes.

**Expiry (time travel)**
24. Status is `Active` one second before `expiresAt`.
25. Status is `Expired` exactly at `expiresAt` (boundary is inclusive).
26. Status is `Expired` well after `expiresAt`.
27. An expired certificate can still be revoked.

**Reads**
28. `statusOf` on a never-issued hash returns `Unknown`.
29. `isValid` is true only for `Active`.
30. `getRecord` returns the stored struct; reverts `CertificateNotFound` for an
    unknown hash.

---

## §6 — Certificate lifecycle

`draft → issued → (revoked)`, with `expired` derived, never stored.

- **draft** — row exists, no PDF, nothing on-chain. Editable.
- **issued** — hash anchored, tx confirmed, PDF in storage, email sent. The
  row's hashed fields become immutable; editing would break verification.
- **revoked** — set on-chain, mirrored into the row for fast listing.
- **expired** — never written anywhere. Computed from `expires_on` at read
  time, by the contract and by the UI. See §8.

---

## §7 — Database schema (Supabase)

**[ASSUMPTION — my design.]** `supabase/migrations/0001_init.sql`.

**Tables**

`orgs` — `id uuid pk`, `slug text unique`, `name text`, `created_at`, `updated_at`.

`staff` — `id uuid pk`, `user_id uuid references auth.users unique`,
`org_id uuid references orgs`, `email text`, `full_name text`,
`role text check (role in ('admin','issuer','viewer'))`, `created_at`, `updated_at`.

`courses` — `id uuid pk`, `org_id uuid references orgs`, `code text`,
`title text`, `created_at`, `updated_at`, `unique (org_id, code)`.

`certificates` — `id uuid pk`, `org_id`, `course_id`, `recipient_name text`,
`recipient_email text`, `issued_on date`, `expires_on date null`,
`cert_hash text null` (0x-prefixed), `tx_hash text null`, `chain_id int null`,
`pdf_path text null`, `status text check (status in ('draft','issued','revoked'))`,
`revoked_reason text null`, `issued_by uuid references staff`,
`created_at`, `updated_at`.

`audit_log` — `id bigint identity pk`, `actor uuid`, `action text`,
`entity text`, `entity_id uuid`, `meta jsonb`, `created_at`.

**Also required**

- `updated_at` trigger function applied to every table that has the column.
- Storage bucket `certificates`, **private**, with **no** public-read policy.
  PDFs are served only through short-lived signed URLs generated server-side.
- RLS enabled on every table.

**RLS shape**

- Staff read and write only rows whose `org_id` matches their own `staff` row.
- Only `admin` and `issuer` roles may insert or update `certificates`.
- Anonymous users get **no** direct table access. The public verify page reads
  through a server route that returns a whitelisted subset of columns —
  never `recipient_email`.

---

## §8 — Web app layout

`web/`, App Router, no `src/`, alias `@/*`.

```
app/
  layout.tsx
  page.tsx                    # landing
  login/page.tsx
  dashboard/
    layout.tsx                # requireStaff() guard
    page.tsx
    certificates/...
  verify/[id]/page.tsx        # public, no auth
  scan/page.tsx               # camera QR scanner
  api/
    health/route.ts
lib/
  env.ts                      # zod, server/public split
  auth.ts                     # requireStaff()
  supabase/
    client.ts                 # browser
    server.ts                 # RSC / route handlers
    admin.ts                  # service role, "server-only"
  chain/
    abi.ts                    # generated — do not edit
    client.ts                 # viem public/wallet clients
    registry.ts               # issue / revoke / statusOf wrappers
  cert/
    hash.ts                   # §3 canonical payload + keccak256
    pdf.ts                    # pdf-lib
    qr.ts                     # qrcode
  email/
    send.ts                   # nodemailer
  status.ts                   # shared status derivation
proxy.ts                      # Next 16 — session refresh + /dashboard guard
supabase/migrations/
scripts/seed.ts
```

**Status derivation (`lib/status.ts`)** — the one place expiry is computed:

```
if (chainStatus is Revoked)          -> "revoked"
else if (chainStatus is Expired)     -> "expired"
else if (chainStatus is Unknown)     -> "not_found"
else if (row.expires_on is past)     -> "expired"   // defensive, should agree
else                                 -> "active"
```

---

## §9 — PDF & QR

`pdf-lib` renders the certificate. `qrcode` produces a PNG data URL embedded in
it. The QR encodes the absolute URL `<APP_URL>/verify/<certificate_id>` — a
URL, not the hash, so a phone camera can open it directly. The `certHash` is
printed on the PDF as text so it can be checked by hand.

## §10 — Email

`nodemailer` over SMTP, server-side only, PDF attached. Failure to send must not
roll back an anchored certificate — the chain write already happened. Log the
failure and surface a resend action.

## §11 — Public verification

`/verify/[id]` works with no account. `/scan` uses `@yudiel/react-qr-scanner`
(client component, needs HTTPS or localhost for camera access). The page shows
status, the course, the issue date, the on-chain tx link, and the hash — never
the recipient's email.

## §12 — Testing

- Contracts: `node:test` + viem, per §5.2. Must be green before Phase 2.
- Web: `vitest`. Cover `lib/cert/hash.ts` (canonicalisation edge cases:
  whitespace, unicode, empty expiry) and `lib/status.ts` (every branch).

---

## §13 — Environment variables

`web/.env.example` carries every one of these, with placeholder values.

**Public** (browser-visible, `NEXT_PUBLIC_`):

| Name | Purpose |
| ---- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key |
| `NEXT_PUBLIC_APP_URL` | Absolute base URL, used in QR payloads |
| `NEXT_PUBLIC_CHAIN_ID` | `80002` (Polygon Amoy) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `CertificateRegistry` |
| `NEXT_PUBLIC_EXPLORER_URL` | e.g. `https://amoy.polygonscan.com` |

**Server** (never `NEXT_PUBLIC_`):

| Name | Purpose |
| ---- | ------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS. Server-only. |
| `RPC_URL` | Amoy RPC endpoint |
| `ISSUER_PRIVATE_KEY` | Signs issue/revoke transactions |
| `SMTP_HOST` | Mail host |
| `SMTP_PORT` | Mail port |
| `SMTP_USER` | Mail username |
| `SMTP_PASSWORD` | Mail password |
| `SMTP_FROM` | From address |

**Contracts** — not in `.env`. Hardhat keystore only, read via
`configVariable()`: `AMOY_RPC_URL`, `AMOY_PRIVATE_KEY`, `ETHERSCAN_API_KEY`.

`lib/env.ts` parses both groups with zod and fails loudly at startup on a
missing or malformed variable. The server schema is never imported from client
code.

---

## §14 — Git

Conventional commits, small and scoped. Branch `main`. Commits end with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## §15 — Phases

- **0** Monorepo root — *done*
- **1** Smart contract — contract, tests, Ignition module, ABI export
- **2** Next.js + Supabase foundation — auth, schema, health check
- **3** Issuing flow — form, hash, PDF, chain write, email
- **4** Verification — public page, QR scanner
- **5** Polish, deploy, documentation
