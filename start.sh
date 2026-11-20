#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must be set}"

run() { /usr/bin/time -p "$@"; }

# This project is a self-contained static site. Publish a clean in-project build.
run mkdir -p "$PROJECT_DIR/dist" "$OPENCODE_WEB_DIR"
run find "$PROJECT_DIR/dist" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
run cp -a "$PROJECT_DIR/public/." "$PROJECT_DIR/dist/"

# Persist deployment metadata for the preview controller, never inside the app build.
run node -e 'const fs=require("node:fs"); const path=require("node:path"); const project=process.argv[1]; const file=path.join(process.env.OPENCODE_WEB_DIR,"deployment-output.json"); fs.writeFileSync(file, JSON.stringify({project, directory:path.join(project,"dist")})+"\n")' "$PROJECT_DIR"

# Stay in the foreground so the controller can own and monitor this process.
cd "$PROJECT_DIR/dist"
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0
