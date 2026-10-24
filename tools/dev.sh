#!/bin/sh
# Starts the Next dev server for the Claude desktop preview launcher.
# Node lives outside the default PATH on this Mac. Webpack mode is used because
# Turbopack's PostCSS step spawns a pooled `node` child, and under the preview
# launcher that spawn fails with ENOENT (it works from a normal shell).
export PATH="/Users/rohit93/.local/opt/node/bin:$PATH"
cd /Users/rohit93/gd-home-fabric || exit 1
rm -f .next/dev/lock
exec node node_modules/next/dist/bin/next dev --webpack --port "${1:-3200}"
