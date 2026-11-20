#!/bin/sh
# Stop hook: block finishing while the test suite fails (exit 2 = block).
npm test --silent >/dev/null 2>&1 || { echo "Tests failing - fix before stopping" >&2; exit 2; }
