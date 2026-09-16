# Certificate Verification

Blockchain-anchored certificate issuance and verification for KIT.

Staff issue a certificate, the system generates a PDF with a QR code, anchors a
hash of the certificate on-chain, and emails it to the recipient. Anyone can
verify a certificate by scanning its QR code — no account required.

> **Status:** Phase 0 (scaffold). Nothing is deployed.

## Structure

| Path         | What it is                                        |
| ------------ | ------------------------------------------------- |
| `contracts/` | Hardhat 3 project — `CertificateRegistry.sol`     |
| `web/`       | Next.js 16 app — issuing dashboard + verification |
| `docs/`      | Explanation, contributions, diagrams, screenshots |

*(`contracts/` and `web/` do not exist yet — added in Phase 1 and Phase 2.)*

## Getting started

_To be written once `contracts/` and `web/` exist._

## Documentation

- [docs/EXPLAIN.md](docs/EXPLAIN.md) — how the system works, phase by phase
- [docs/CONTRIBUTIONS.md](docs/CONTRIBUTIONS.md) — who did what

## Licence

Not yet decided.
