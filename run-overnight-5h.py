#!/usr/bin/env python3
"""Run overnight.sh for at most five hours, then sleep the Mac."""
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
if (ROOT / ".overnight-done").exists():
    raise SystemExit("An existing .overnight-done marker was found. Review it before starting a new run.")
if (ROOT / ".overnight-stop").exists():
    raise SystemExit("An existing .overnight-stop marker was found. Remove it when ready to run.")

def stop_group(process):
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    time.sleep(5)
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait()

env = dict(os.environ, LIMIT_WAIT_MIN="5")
print("Five-hour timer starts now, including time waiting for Claude's reset.", flush=True)
process = subprocess.Popen(["bash", "overnight.sh", "--hours", "5"],
                           env=env, start_new_session=True)
try:
    try:
        code = process.wait(timeout=5 * 3600)
    except subprocess.TimeoutExpired:
        print("Five-hour limit reached. Stopping Claude before sleeping.", flush=True)
        stop_group(process)
    else:
        tasks = ROOT / "docs/OVERNIGHT_TASKS.md"
        lines = tasks.read_text().splitlines() if tasks.exists() else []
        complete = (code == 0 and (ROOT / ".overnight-done").exists()
                    and any(line.startswith("- [x]") for line in lines)
                    and not any(line.startswith("- [ ]") for line in lines))
        if not complete:
            raise SystemExit("Run stopped without confirmed checklist completion. Mac will remain awake; review .overnight/run.log.")
        print("Claude reports completion and all checklist boxes are checked. This is not an independent verification.", flush=True)
    print("Mac will sleep in five minutes. Press Ctrl+C to cancel sleep.", flush=True)
    time.sleep(300)
    subprocess.run(["/usr/bin/pmset", "sleepnow"], check=True)
except KeyboardInterrupt:
    stop_group(process)
    print("Stopped. Automatic sleep cancelled.", flush=True)
