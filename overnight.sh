#!/usr/bin/env bash
# =============================================================================
#  overnight.sh — let Claude Code finish CertChain KH on its own (up to 24h)
#
#  Put this file in your project root (next to CLAUDE.md), then:
#     chmod +x overnight.sh
#     ./overnight.sh --check              # tonight: make sure everything is ready
#     ./overnight.sh --start-at 07:00     # waits until 7:00, then runs for 24h
#     ./overnight.sh                      # start right now
#
#  Options:
#     --hours N        how long to keep going (default 24)
#     --start-at HH:MM wait until this time before starting
#     --max-turns N    tool calls per round (default 150)
#     --mode MODE      Claude Code permission mode (default dontAsk)
#     --check          only run the pre-flight checks, then exit
#
#  Stop it any time:  Ctrl+C   or   touch .overnight-stop
#  Watch progress:    tail -f .overnight/run.log   |   git log --oneline
# =============================================================================
set -uo pipefail

HOURS=24
START_AT=""
MAX_TURNS=150
MODE="dontAsk"
CHECK_ONLY=0
LIMIT_WAIT_MIN="${LIMIT_WAIT_MIN:-15}"         # how long to wait when the usage limit is hit
MAX_FAILS="${MAX_FAILS:-12}"               # stop after this many real errors in a row
MAX_NO_PROGRESS="${MAX_NO_PROGRESS:-5}"         # stop after this many rounds with no new commits

usage() { sed -n '2,22p' "$0"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hours)      HOURS="$2"; shift 2 ;;
    --start-at)   START_AT="$2"; shift 2 ;;
    --max-turns)  MAX_TURNS="$2"; shift 2 ;;
    --mode)       MODE="$2"; shift 2 ;;
    --check)      CHECK_ONLY=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"
mkdir -p .overnight/logs docs
RUN_LOG=".overnight/run.log"

say()  { echo "[$(date '+%F %T')] $*" | tee -a "$RUN_LOG"; }
fail() { say "❌ $*"; exit 1; }

# -----------------------------------------------------------------------------
# 1. Pre-flight checks
# -----------------------------------------------------------------------------
REQUIRED_ENV=(
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_DB_URL
  AMOY_RPC_URL
  ISSUER_PRIVATE_KEY
  ETHERSCAN_API_KEY
  GMAIL_USER
  GMAIL_APP_PASSWORD
  CRON_SECRET
  ADMIN_EMAIL
  ADMIN_PASSWORD
)

preflight() {
  say "🔎 Pre-flight checks in $ROOT"
  [[ -f CLAUDE.md ]] || fail "CLAUDE.md not found. Put overnight.sh in the project root."

  for cmd in claude node npm npx git; do
    command -v "$cmd" >/dev/null 2>&1 || fail "'$cmd' is not installed or not in PATH."
  done

  local v major minor
  v="$(node -p 'process.versions.node')"
  major="${v%%.*}"; minor="$(echo "$v" | cut -d. -f2)"
  if (( major < 22 )) || { (( major == 22 )) && (( minor < 13 )); }; then
    fail "Node $v is too old. Hardhat 3 needs Node 22.13+."
  fi
  say "   Node $v ✓"

  [[ -f web/.env.local ]] || say "No web/.env.local; credential-dependent tasks will be blocked."

  # Load env so Hardhat, scripts and Claude's commands all see the same values
  set -a
  # shellcheck disable=SC1091
  [[ ! -f web/.env.local ]] || . web/.env.local || fail "web/.env.local has a syntax problem (wrap values with spaces in quotes)."
  [[ -f contracts/.env ]] && . contracts/.env
  set +a
  # Match the app's canonical RPC/SMTP names while accepting older runner names.
  export AMOY_RPC_URL="${AMOY_RPC_URL:-${RPC_URL:-}}"
  export RPC_URL="${RPC_URL:-${AMOY_RPC_URL:-}}"
  export GMAIL_USER="${GMAIL_USER:-${SMTP_USER:-}}"
  export SMTP_USER="${SMTP_USER:-${GMAIL_USER:-}}"
  export GMAIL_APP_PASSWORD="${GMAIL_APP_PASSWORD:-${SMTP_PASSWORD:-}}"
  export SMTP_PASSWORD="${SMTP_PASSWORD:-${GMAIL_APP_PASSWORD:-}}"
  export SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
  export SMTP_PORT="${SMTP_PORT:-587}"
  export SMTP_FROM="${SMTP_FROM:-${SMTP_USER:-}}"
  export AMOY_PRIVATE_KEY="${AMOY_PRIVATE_KEY:-${ISSUER_PRIVATE_KEY:-}}"

  local missing=()
  for k in "${REQUIRED_ENV[@]}"; do
    [[ -n "${!k:-}" ]] || missing+=("$k")
  done
  if (( ${#missing[@]} )); then
    say "Missing credentials: ${missing[*]}. Continuing with independent coding tasks."
  else
    say "   Env keys ✓ (${#REQUIRED_ENV[@]} found)"
  fi

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { git init -q && say "   git initialized"; }
  grep -qxF '.overnight/' .gitignore 2>/dev/null || echo '.overnight/' >> .gitignore
  grep -qxF '.overnight-done' .gitignore 2>/dev/null || echo '.overnight-done' >> .gitignore
  grep -qxF '.env*' .gitignore 2>/dev/null || printf '.env*\n!.env.example\n' >> .gitignore

  say "   Testing Claude Code login..."
  local out
  out="$(claude -p "Reply with exactly: READY" --max-turns 1 2>&1 || true)"
  if echo "$out" | grep -q "READY"; then
    say "   Claude Code ✓"
  elif echo "$out" | grep -qiE 'limit'; then
    say "   ⚠️  Claude Code is logged in but currently at the usage limit (fine if you start later)."
  else
    fail "Claude Code didn't respond correctly. Run 'claude' once to log in. Output: $out"
  fi
  say "✅ Pre-flight passed."
}

# -----------------------------------------------------------------------------
# 2. Permissions for unattended work (safe allowlist + hard blocks)
# -----------------------------------------------------------------------------
write_permissions() {
  mkdir -p .claude
  local f=".claude/settings.local.json"
  if [[ -f "$f" ]] && ! grep -q 'written by overnight.sh' "$f"; then
    cp "$f" "$f.backup-$(date +%s)"
    say "   Backed up your existing $f"
  fi
  cat > "$f" <<'JSON'
{
  "_comment": "overnight — written by overnight.sh",
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep", "WebFetch", "WebSearch",
      "Bash(npm *)", "Bash(npx *)", "Bash(node *)", "Bash(pnpm *)", "Bash(tsx *)",
      "Bash(git *)",
      "Bash(ls *)", "Bash(ls)", "Bash(cat *)", "Bash(head *)", "Bash(tail *)", "Bash(wc *)",
      "Bash(grep *)", "Bash(rg *)", "Bash(find *)", "Bash(sed *)", "Bash(awk *)",
      "Bash(sort *)", "Bash(diff *)", "Bash(echo *)", "Bash(printf *)", "Bash(pwd)",
      "Bash(which *)", "Bash(test *)", "Bash(jq *)", "Bash(tree *)", "Bash(du *)", "Bash(date *)",
      "Bash(mkdir *)", "Bash(touch *)", "Bash(cp *)", "Bash(mv *)", "Bash(rm *)", "Bash(chmod *)",
      "Bash(cd *)", "Bash(env *)", "Bash(export *)", "Bash(source *)",
      "Bash(curl *)", "Bash(lsof *)", "Bash(kill *)", "Bash(pkill *)", "Bash(ps *)",
      "Bash(sleep *)", "Bash(timeout *)",
      "Bash(psql *)", "Bash(supabase *)"
    ],
    "deny": [
      "Bash(sudo *)",
      "Bash(rm -rf /*)", "Bash(rm -rf ~*)", "Bash(rm -rf ..*)",
      "Bash(git push --force*)", "Bash(git push -f*)",
      "Bash(git reset --hard*)", "Bash(git clean *)",
      "Bash(vercel *)", "Bash(npm publish*)",
      "Read(~/.ssh/**)", "Read(~/.aws/**)"
    ]
  }
}
JSON
  say "   Permissions written to $f"
}

# -----------------------------------------------------------------------------
# 3. Master task list (created once; Claude ticks the boxes as it goes)
# -----------------------------------------------------------------------------
write_tasks() {
  local f="docs/OVERNIGHT_TASKS.md"
  if [[ -f "$f" ]]; then say "   Using existing $f"; return; fi
  cat > "$f" <<'TASKS'
# OVERNIGHT TASKS — CertChain KH
Work top to bottom. Tick `- [x]` only when a task truly works and its checks pass.
If a task is blocked by something only Dorito can do, write it in docs/BLOCKERS.md, leave the box unticked, and move on.
Full project spec: CLAUDE.md. Available settings are exported from web/.env.local. Some credentials may be missing; record those blockers and continue independent coding tasks.

## A. Environment, database, contract
- [ ] A1. Audit the repo vs CLAUDE.md: list what exists, what's missing, and any mock/placeholder/TODO code → docs/PROGRESS_LOG.md
- [ ] A2. Add a chain switch: `NEXT_PUBLIC_CHAIN=local|amoy`. Local = Hardhat node on 127.0.0.1:8545 with the contract deployed there by a script. All automated tests use LOCAL (fast + saves test POL). Amoy is used only for the real app and one final e2e run.
- [ ] A3. CREATE THE DATABASE: apply web/supabase/migrations (CLAUDE.md §7, improved if needed) to Supabase using `npx supabase db push --db-url "$SUPABASE_DB_URL"` (fallback: a node script with the `pg` package). Verify every table, function, index and RLS policy exists by querying the DB.
- [ ] A4. Create the private storage bucket `certificates` with the admin client (idempotent script).
- [ ] A5. Seed script (idempotent): create the auth user ADMIN_EMAIL / ADMIN_PASSWORD with the admin API if missing, org KIT "Kirirom Institute of Technology", admin staff row, 3 courses (one with no expiry). Run it.
- [ ] A6. Deploy CertificateRegistry to Amoy with Ignition (AMOY_PRIVATE_KEY + AMOY_RPC_URL are exported) if not already deployed. Check the wallet POL balance first; if it's too low, log a blocker. Verify on PolygonScan (Etherscan V2 key). Export the ABI. Write NEXT_PUBLIC_CONTRACT_ADDRESS into web/.env.local and README.
- [ ] A7. Contract tests: all tests from CLAUDE.md §5 pass (`npx hardhat test`).

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
TASKS
  say "   Created $f"
}

ITER_PROMPT="$(cat <<'PROMPT'
You are running UNATTENDED in an overnight build loop. No human will answer questions. Never ask for confirmation.

Do not send real emails, deploy to public networks, or publish. Record those steps as requiring owner action. Missing credentials must not block independent coding work. Never invent credentials or claim unrun checks passed.

1. Read CLAUDE.md, docs/OVERNIGHT_TASKS.md, docs/PROGRESS_LOG.md and docs/BLOCKERS.md (if they exist).
2. Pick the FIRST unticked task in docs/OVERNIGHT_TASKS.md and complete it fully. Then continue with the next ones. Do as many as you can this round.
3. For every task: check current official docs if unsure → implement → run the relevant checks (tests/typecheck/lint/build) → fix until green → tick the box → append 2–4 lines to docs/PROGRESS_LOG.md (time, task, what changed, result) → git commit (Conventional Commits). Commit often so progress is never lost.
4. If a task needs something only Dorito can do (missing key, empty wallet, dashboard click), write the exact steps in docs/BLOCKERS.md, skip it, and continue with other tasks.
5. Never fake success: no mocks in the app, no skipped or deleted tests, no ticking unverified tasks.
6. Before the round ends, stop any dev servers or Hardhat nodes you started (ports 3000, 8545) and commit.
7. When EVERY task is ticked and all checks pass, create an empty file named .overnight-done in the project root.
8. If a previous round left work half-done (uncommitted changes, failing tests), finish or fix that first.
PROMPT
)"

# -----------------------------------------------------------------------------
# 4. Helpers
# -----------------------------------------------------------------------------
wait_until() {
  local target="$1" now ts
  now="$(date +%s)"
  if date -j >/dev/null 2>&1; then   # macOS / BSD date
    ts="$(date -j -f "%Y-%m-%d %H:%M" "$(date +%Y-%m-%d) $target" +%s)" || fail "Bad time: $target (use HH:MM)"
  else                               # GNU date (Linux)
    ts="$(date -d "today $target" +%s)" || fail "Bad time: $target (use HH:MM)"
  fi
  (( ts <= now )) && ts=$(( ts + 86400 ))
  say "⏳ Waiting until $target (about $(( (ts - now) / 60 )) minutes). Keep the laptop plugged in with the lid open."
  while (( $(date +%s) < ts )); do
    [[ -f .overnight-stop ]] && { rm -f .overnight-stop; say "Stopped while waiting."; exit 0; }
    sleep 30
  done
}

AWAKE_PID=""
keep_awake() {
  if command -v caffeinate >/dev/null 2>&1; then
    caffeinate -dimsu -w $$ & AWAKE_PID=$!
    say "☕ caffeinate on (Mac won't sleep while this runs)"
  elif command -v systemd-inhibit >/dev/null 2>&1; then
    systemd-inhibit --what=sleep:idle --why="overnight build" sleep $(( (HOURS + 48) * 3600 )) & AWAKE_PID=$!
    say "☕ systemd-inhibit on"
  else
    say "⚠️  Couldn't block sleep automatically. Turn off sleep in your power settings."
  fi
}

cleanup() {
  [[ -n "$AWAKE_PID" ]] && kill "$AWAKE_PID" 2>/dev/null
  say "🏁 Finished. Tasks done: $(count_done) / $(count_total). See docs/PROGRESS_LOG.md and docs/BLOCKERS.md"
}

count_done()  { local n; n="$(grep -c '^- \[x\]' docs/OVERNIGHT_TASKS.md 2>/dev/null)"; echo "${n:-0}"; }
count_total() { local n; n="$(grep -cE '^- \[( |x)\]' docs/OVERNIGHT_TASKS.md 2>/dev/null)"; echo "${n:-0}"; }

hit_usage_limit() {  # only trust the final lines of a failed round
  local log="$1"
  tail -n 5 "$log" | grep -qiE 'usage limit|limit (reached|will reset)|resets? (at|in) |hit your limit|out of (extra )?usage|rate_limit_error|overloaded'
}

# -----------------------------------------------------------------------------
# 5. Main
# -----------------------------------------------------------------------------
preflight
write_permissions
write_tasks
if (( CHECK_ONLY )); then
  say "Check-only mode. Everything is ready. Run it later with: ./overnight.sh --start-at HH:MM"
  exit 0
fi

[[ -n "$START_AT" ]] && wait_until "$START_AT"

if git rev-parse --verify -q HEAD >/dev/null; then
  git add -A
  if git diff --cached --name-only | grep -E '(^|/)\.env' | grep -qv 'example'; then
    git reset -q
    fail "An .env file was about to be committed. Fix .gitignore first (secrets must never go to GitHub)."
  fi
  git commit -qm "chore: snapshot before overnight run" >/dev/null 2>&1
  git switch -q overnight-build 2>/dev/null || git switch -qc overnight-build
  say "🌿 Working on branch 'overnight-build' (main stays safe)"
fi

keep_awake
trap cleanup EXIT
trap 'say "Interrupted."; exit 130' INT TERM

DEADLINE=$(( $(date +%s) + HOURS * 3600 ))
iter=0; fails=0; no_progress=0
say "🚀 Overnight run started for ${HOURS}h (mode: $MODE, max turns/round: $MAX_TURNS)"

while :; do
  [[ -f .overnight-done ]] && { say "✅ Claude reports every task is complete."; break; }
  [[ -f .overnight-stop ]] && { rm -f .overnight-stop; say "🛑 Stop file found."; break; }
  (( $(date +%s) >= DEADLINE )) && { say "⏰ ${HOURS}h time limit reached."; break; }

  iter=$(( iter + 1 ))
  log=".overnight/logs/round-$(printf '%03d' "$iter")-$(date +%m%d-%H%M).jsonl"
  before="$(git rev-parse -q HEAD 2>/dev/null || echo none)"
  say "▶ Round $iter started (log: $log)"

  claude -p "$ITER_PROMPT" \
    --permission-mode "$MODE" \
    --max-turns "$MAX_TURNS" \
    --output-format stream-json --verbose \
    > "$log" 2>&1
  code=$?
  is_err=0
  (( code != 0 )) && is_err=1
  tail -n 3 "$log" | grep -q '"is_error":true' && is_err=1
  tail -n 3 "$log" | grep -q 'error_max_turns' && is_err=0   # ran out of turns = normal

  after="$(git rev-parse -q HEAD 2>/dev/null || echo none)"
  done_n="$(count_done)"

  if (( is_err )) && hit_usage_limit "$log"; then
    say "⏸  Usage limit hit. Waiting ${LIMIT_WAIT_MIN} min, then trying again..."
    sleep $(( LIMIT_WAIT_MIN * 60 ))
    continue
  fi

  if (( is_err )); then
    fails=$(( fails + 1 ))
    say "⚠️  Round $iter ended with an error (exit $code, $fails in a row). Last lines:"
    tail -n 3 "$log" | cut -c1-300 | tee -a "$RUN_LOG"
    (( fails >= MAX_FAILS )) && { say "Too many errors in a row. Stopping."; break; }
    s=$(( fails * 60 )); (( s > 600 )) && s=600; sleep "$s"
    continue
  fi
  fails=0

  if [[ "$before" == "$after" ]]; then
    no_progress=$(( no_progress + 1 ))
    say "…  Round $iter made no new commits ($no_progress in a row)."
    (( no_progress >= MAX_NO_PROGRESS )) && { say "No progress for $MAX_NO_PROGRESS rounds. Check docs/BLOCKERS.md. Stopping."; break; }
  else
    no_progress=0
    say "✔  Round $iter done. New commits: $(git rev-list --count "$before".."$after" 2>/dev/null || echo '?'). Tasks ticked: $done_n"
  fi
  sleep 5
done
