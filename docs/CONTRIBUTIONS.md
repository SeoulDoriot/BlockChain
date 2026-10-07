# Individual Contribution Report

| | |
| --- | --- |
| **Student** | Vy Seoul |
| **Email** | vy.seoul25@kit.edu.kh |
| **Institution** | Kirirom Institute of Technology (KIT) |
| **Project** | Certify — Blockchain-Anchored Certificate Verification |
| **Team** | Individual project (sole contributor) |

## My role

I was the only team member, so I was responsible for the whole project: deciding
what to build, directing the implementation, reviewing and testing the result,
and preparing the documentation and the demo.

## What I did

**Requirements and specification**
- Defined the scope from the course handout: the ten required pages and the
  thirteen functional requirements (login, issuing, PDF, blockchain anchoring,
  verification by ID and QR, status, email, expiry, revocation).
- Approved the working specification in `CLAUDE.md`: the architecture
  (Supabase + Next.js + Solidity contract), the hashing rules, the database
  schema and the engineering rules, including "no personal data on-chain".
- Planned the build in phases (contract → foundation → issuing → verification →
  polish) and checked that each phase met its goals before moving on.

**Design direction**
- Wrote the UI brief: an Apple + Notion style that is premium, minimal and
  institutional rather than "crypto", with a sidebar dashboard, soft status
  colours, and blockchain details kept in the background.
- Reviewed each screen and asked for changes, for example: larger public pages
  on wide screens, a fuller verification page, and keeping signed-in staff
  inside the dashboard instead of sending them to the public pages.

**Testing and quality**
- Used the system as an administrator and issuer: signed in, issued certificates,
  verified them by ID and QR, revoked and renewed them.
- Found and reported real defects, which were then fixed and re-tested:
  - the verification pages sent signed-in staff out of the dashboard, and "Back"
    went to the home page;
  - a shortened certificate ID, or a pasted verify link, returned "Not found";
  - after the local blockchain restarted, valid certificates read "Not found"
    while still showing their details.
- Identified missing features from a university's point of view and had them
  added: **course management** (add, rename, delete courses) and a
  **signatory** (the chairman or dean's name, title and signature image on
  every certificate).

**Delivery**
- Recorded the demo video.
- Prepared this submission: documentation, repository and report.

## Use of AI tools

This project was built with substantial help from **Claude Code**, an AI coding
assistant made by Anthropic. In the interest of academic honesty:

| | Me | Claude Code (AI) |
| --- | --- | --- |
| Requirements, scope, priorities | ✔ decided | — |
| Specification and design brief | ✔ wrote and approved | drafted parts for my approval |
| Source code (contract, web app, database, tests) | reviewed and directed | ✔ generated most of it |
| Testing | ✔ manual testing, found bugs | wrote and ran the automated tests |
| Bug fixing | ✔ reported, re-tested | implemented the fixes |
| Documentation | reviewed | ✔ drafted |
| Demo video | ✔ recorded | — |

Every feature listed in this report was run and checked on a real local stack:
a real Postgres database, a real local blockchain, real PDFs and real email
delivery to a local inbox. Nothing is mocked.

## Evidence

The full history of the work is in the Git repository. The automated test
results at the time of submission:

| Suite | Result |
| ----- | ------ |
| Smart contract tests | 30 passing |
| Web unit tests | 89 passing |
| End-to-end browser tests (real database and chain) | 14 passing |
| Typecheck and lint | clean |
