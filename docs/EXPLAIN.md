# EXPLAIN

A plain-language walkthrough of how this system works, written to be read by
someone who has not seen the code. Each phase appends its own section.

## Contents

- Phase 0 — Scaffold
- Phase 1 — Smart Contract
- Phase 2 — Next.js + Supabase Foundation

## Phase 0 — Scaffold

The repository root was created: `README.md`, `.gitignore`, and this `docs/`
folder with `EXPLAIN.md`, `CONTRIBUTIONS.md`, `diagrams/`, and `screenshots/`.

No application code exists yet. `contracts/` arrives in Phase 1 and `web/` in
Phase 2.

## Phase 1 — Smart Contract

### What the contract is for

`CertificateRegistry.sol` is the part of the system nobody can quietly edit —
not a student, not a member of staff, not the university's own database
administrator. It holds a fingerprint of every certificate KIT has issued, on a
public blockchain, where changing history is not possible.

Everything else in this project is a convenience wrapped around that one fact.

### What each function does

| Function | Who can call it | What it does |
| -------- | --------------- | ------------ |
| `issue(certHash, expiresAt)` | `ISSUER_ROLE` | Records one certificate fingerprint, with an optional expiry date. Rejects a hash that has already been issued. |
| `issueBatch(hashes[], expiries[])` | `ISSUER_ROLE` | The same thing for a whole graduating class in one transaction. All-or-nothing: if one entry is bad, none are written. |
| `revoke(certHash, reason)` | `ISSUER_ROLE` | Marks a certificate permanently revoked, with a human-readable reason. Cannot be undone. |
| `statusOf(certHash)` | anyone | Returns `Unknown`, `Active`, `Expired` or `Revoked`. Free to call. |
| `isValid(certHash)` | anyone | A convenience shortcut — true only when the status is `Active`. |
| `getRecord(certHash)` | anyone | Returns the full stored record: issue time, expiry, revoked flag, and which address issued it. |

### Roles

The contract uses OpenZeppelin's `AccessControl`, which is a permission system
rather than a single owner.

- **`DEFAULT_ADMIN_ROLE`** — can grant and revoke roles. Held by the wallet that
  deployed the contract. This is the key that must be protected most carefully.
- **`ISSUER_ROLE`** — can issue and revoke certificates, but cannot hand that
  power to anyone else.

The separation matters. Day-to-day issuing runs from an issuer wallet. If that
wallet is ever compromised, the admin removes its role and the damage stops
there — no need to redeploy the contract or migrate anything.

### Why only hashes go on-chain

A public blockchain is the opposite of private: every byte written is readable
by anyone, anywhere, forever, and cannot be deleted. Putting a student's name,
email address or grade on it would be a permanent, irreversible privacy breach,
and under most data-protection regimes it would be unlawful — the "right to
erasure" cannot be honoured on a chain that does not allow erasure.

So the chain stores a **keccak256 hash** — a 32-byte fingerprint. It has two
properties that make this work:

1. **One-way.** You cannot run a hash backwards to recover the name and email
   that produced it.
2. **Collision-resistant.** Changing any single character of the certificate
   produces a completely different hash.

A verifier who already holds the certificate can recompute the hash and compare
it to the chain. A stranger reading the chain learns nothing except that *some*
certificate was issued at *some* time. That is exactly the right amount of
information to publish.

### How `Expired` works without a cron job

This is the design decision worth understanding, because the obvious solution is
worse.

The obvious solution is a scheduled job that runs every night, finds certificates
whose expiry date has passed, and writes "expired" to each one. That would mean:
a server that must never go down, a wallet that must always hold gas, one
blockchain transaction per expiring certificate, and a window every day during
which the data is simply wrong.

Instead, expiry is **derived at read time**. Nothing is ever written. The
contract stores `expiresAt` once, at issue, and `statusOf()` compares it to the
current block's timestamp each time someone asks:

```solidity
if (r.issuedAt == 0) return Status.Unknown;
if (r.revoked) return Status.Revoked;
if (r.expiresAt != 0 && block.timestamp >= r.expiresAt) return Status.Expired;
return Status.Active;
```

A certificate becomes expired the moment the chain's clock passes its expiry
date. No job, no server, no gas, no delay. Note also the branch order:
revocation is checked **before** expiry, so a revoked certificate keeps reading
`Revoked` even after its expiry date passes. Revocation is the more serious
fact, and it should not be hidden behind a milder one.

`expiresAt == 0` is the sentinel for "never expires", which is what most degree
certificates want.

### Gas and why we use a testnet

Writing to a blockchain costs money, because thousands of computers store the
result forever. That fee is called **gas**, and it is paid in the network's own
currency.

Reading costs nothing. So the expensive operations here are `issue` and
`revoke`; verification — which is what the public actually does — is free.

We deploy to **Polygon Amoy**, a test network. Amoy behaves like the real Polygon
network but its currency has no monetary value and is handed out free by
faucets. This lets the project be built, demonstrated and marked without anyone
spending real money, while using exactly the same code that would run on
mainnet. Moving to production would mean changing one RPC URL and one chain ID.

`issueBatch` exists for the same reason: one transaction for forty graduates is
dramatically cheaper than forty transactions, because a large part of the cost is
per-transaction overhead rather than per-certificate.

### Testing

30 tests, all passing, using the Node.js test runner with viem. The interesting
ones are the expiry tests, which use Hardhat's network helpers to fast-forward
the blockchain's clock — so the boundary behaviour can be tested exactly rather
than waited for:

- `Active` one second before expiry
- `Expired` exactly *at* expiry (the boundary is inclusive)
- `Expired` long after
- still revocable after expiry

Test 17 is worth calling out: it issues a batch where the second entry is
invalid, then asserts that the **first** entry was not written either. That is
the atomicity guarantee, and it matters — a half-applied batch would leave the
database and the chain permanently out of step.

### Five questions a lecturer might ask

**1. What actually stops someone forging a certificate?**

Nothing stops them producing a convincing-looking PDF. What stops the forgery
*succeeding* is that verification recomputes the hash from the certificate's
contents and looks for it on-chain. A forged certificate produces a hash that was
never issued, so `statusOf` returns `Unknown`. To defeat this, an attacker would
need the issuer's private key — at which point the problem is key management,
not the blockchain.

**2. Why a blockchain? A signed PDF or a database lookup would be simpler.**

Both are good answers to a different question. A signed PDF proves the document
came from KIT, but KIT can re-sign a replacement and nobody can tell. A database
lookup is only as trustworthy as whoever controls the database — including KIT
itself, and anyone who compromises it. The blockchain adds one specific
property: *KIT cannot silently rewrite its own history*. An issued hash is
public and permanent. Revocation is possible, but it is a visible, timestamped,
attributable event rather than a quiet edit. Whether a university needs that
property is a fair question to debate; this project assumes it does.

**3. Someone's certificate contains a typo. What happens?**

It cannot be edited, by design — editing it would change the hash and break
verification. The correct procedure is to `revoke` the wrong certificate with a
reason, then `issue` a corrected one. The revocation stays on the record
permanently. This is deliberate: an audit trail that can be tidied up is not an
audit trail.

**4. What if KIT loses the admin private key?**

Issued certificates keep verifying forever — reads do not need any key. What is
lost is the ability to issue new certificates or revoke existing ones, and the
fix is to deploy a fresh contract and point the application at it. Old
certificates remain verifiable against the old contract. This is a real
operational risk and the reason the admin key should be held separately from the
day-to-day issuer key, ideally in a multi-signature wallet for a production
deployment.

**5. Is storing a hash of the student's email really privacy-safe?**

Mostly, with a caveat worth being honest about. The hash cannot be reversed, but
if an attacker already suspects a specific person attended a specific course,
they could hash their guess and check whether it matches — a dictionary attack.
The exposure is small here, because the payload also includes a random UUID that
an attacker would have to know. A production system wanting stronger guarantees
would add a secret salt held server-side, which would make guessing impossible
without also breaching the database. That is a deliberate, documented trade-off
rather than an oversight.

## Phase 2 — Next.js + Supabase Foundation

Phase 1 built the part that cannot be tampered with. Phase 2 builds the part
people actually use, and the question it has to answer is: **who is allowed to
do what?**

### The auth flow

When a member of staff signs in, Supabase hands the browser a signed token
stored in a cookie. Every request afterwards carries that cookie. Three pieces
work together:

**1. `proxy.ts`** — runs before any page renders. In Next.js 16 this file used
to be called `middleware.ts`; the framework renamed it to Proxy because it sits
in front of the app like a network proxy rather than acting like Express
middleware. It does two jobs: it refreshes the session so the token does not go
stale mid-visit, and it redirects anyone without a valid session away from
`/dashboard/*` to `/login`.

**2. `requireStaff()` in `lib/auth.ts`** — runs inside the pages and routes
themselves. The proxy is a coarse gate; this is the fine one. It verifies the
token, loads the caller's `staff` row and their organisation, and throws a 401
(not signed in) or 403 (signed in, but not staff here) otherwise.

**3. Row-level security** — runs inside the database, underneath both.

The redundancy is deliberate. The proxy could be bypassed by a bug in a route
matcher; `requireStaff()` could be forgotten on a new page. RLS is the layer
that still holds when the other two fail.

### One rule worth stating plainly: never `getSession()`

Supabase offers `getSession()`, which reads the session from the cookie. It is
fast, and it is **not safe for authorisation**, because it does not verify that
the cookie is genuine. Anyone can write whatever they like into their own
browser's cookies.

This project uses `getClaims()`, which verifies the token's cryptographic
signature before believing a word of it, with `getUser()` for the canonical
user record. The difference is the difference between reading a name badge and
checking a passport.

### RLS in simple words

Row-level security means the **database itself** decides which rows a given
person is allowed to see, instead of the application deciding and the database
obediently handing over everything.

Without RLS, security lives in application code: every query has to remember to
add "…and only where this row belongs to the right university." Forget that
clause once, in one place, and you have leaked every certificate in the system.
It is a rule enforced by everyone remembering it, which means it is a rule
enforced by nobody.

With RLS, the rule lives next to the data:

```sql
create policy "staff read own org certificates"
  on public.certificates for select
  to authenticated
  using (org_id = public.current_org_id());
```

Now a query for *all* certificates silently returns only that person's
organisation's certificates. A careless query and a careful query produce the
same safe answer. The safe path is the default path, which is the only kind of
security rule that survives contact with a real codebase.

The policies here say, in plain English:

- Staff can read their own organisation's data. Not other organisations'.
- Only admins and issuers can create or change certificates. Viewers can look.
- Only admins can manage staff and courses.
- Only draft certificates can be deleted. An issued one is on the blockchain
  and deleting the database row would not unsay it.
- **Nobody** can write to the audit log through the normal client. An audit
  trail that the audited party can edit is not an audit trail.
- Anonymous visitors get no direct table access whatsoever. The public verify
  page reads through a server route that hands back a whitelisted set of
  columns — never the recipient's email address.

### Why the service role key is server-only

Supabase issues two keys.

The **anon key** is public by design. It is in the browser bundle, and that is
fine, because every request it makes is still filtered by RLS. It is a key to
the front door of a building where every individual room is still locked.

The **service role key** bypasses RLS completely. It is not a key to a room; it
is the master key, plus permission to ignore every lock in the building. With
it, anyone can read every certificate, every email address, and rewrite any row.

So `lib/supabase/admin.ts` begins with:

```ts
import "server-only";
```

That line makes the build **fail** if any client component ever imports this
module, directly or through a chain of imports. It converts a catastrophic
runtime leak into a compile error that cannot be merged. The same guard is on
`lib/env.server.ts`, which holds the key itself, and on `lib/auth.ts`.

The service role is used in exactly three places: signing short-lived URLs for
private PDFs, writing audit rows, and the seed script. Everything a signed-in
member of staff does goes through the ordinary client, where RLS still applies.

### Private storage

The `certificates` storage bucket is created private, and — deliberately — with
**no** access policies at all. With RLS on and no policy granting anything,
neither anonymous nor signed-in users can fetch an object directly, even with
the exact path. PDFs reach people only through short-lived signed URLs minted on
the server. A certificate PDF is not something that should be downloadable by
anyone who guesses a filename.

### Health check

`/api/health` verifies three things independently: the database answers, the RPC
endpoint reports the chain id we expect (catching a config pointing at the wrong
network), and there is real contract bytecode at the configured address
(catching a typo'd or not-yet-deployed address). It returns 503 unless all three
pass, so it can be wired to an uptime monitor as-is.
