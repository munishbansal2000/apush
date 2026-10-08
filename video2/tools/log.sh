#!/usr/bin/env bash
# Run a command and keep its full output (stdout + stderr, timestamped) under out/logs/:
#   out/logs/<name>-YYYYmmdd-HHMMSS.log   one file per run
#   out/logs/<name>-latest.log            copy of the most recent run
# The command's exit code is preserved.  Usage: tools/log.sh <name> <command> [args...]
set -o pipefail
name="$1"; shift
dir="$(cd "$(dirname "$0")/.." && pwd)/out/logs"
mkdir -p "$dir"
stamp="$(date +%Y%m%d-%H%M%S)"
log="$dir/$name-$stamp.log"
{
  echo "# $name  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# cmd: $*"
  echo "# git: $(git -C "$dir/../.." rev-parse --short HEAD 2>/dev/null || echo n/a)"
} > "$log"
"$@" 2>&1 | while IFS= read -r line; do printf '%s %s\n' "$(date +%H:%M:%S)" "$line"; done | tee -a "$log"
code=${PIPESTATUS[0]}
echo "# exit $code" >> "$log"
cp "$log" "$dir/$name-latest.log"
echo "log → $log"
exit "$code"
