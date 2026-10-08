#!/usr/bin/env bash
# Regenerates facilitator/step-0..4 (read-only snapshots of participant files),
# facilitator/step-1..4.diff and FACILITATOR.md from the step branches.
# Usage (on the facilitator branch): scripts/build-facilitator.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
remote="${REMOTE:-origin}"
git fetch -q "$remote" main step-1 step-2 step-3 step-4

ref() { if [ "$1" = 0 ]; then echo "$remote/main"; else echo "$remote/step-$1"; fi; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for n in 0 1 2 3 4; do
  rm -rf "facilitator/step-$n"
  mkdir -p "facilitator/step-$n" "$work/step-$n"
  git archive "$(ref "$n")" | tar -x -C "facilitator/step-$n"
  git archive "$(ref "$n")" | tar -x -C "$work/step-$n"
  if [ "$n" -gt 0 ]; then
    git diff "$(ref $((n - 1)))" "$(ref "$n")" > "facilitator/step-$n.diff"
  fi
done
chmod -R a-w facilitator/step-[0-4] 2>/dev/null || true

python3 scripts/render-facilitator.py facilitator/templates/FACILITATOR.template.md "$work" > FACILITATOR.md
echo "Snapshots, diffs and FACILITATOR.md regenerated from $(ref 0) and $remote/step-1..4."
