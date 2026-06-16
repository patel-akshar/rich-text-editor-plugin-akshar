#!/bin/bash
set -e

echo "========================================"
echo "  Java Lint (Checkstyle, SpotBugs, PMD)"
echo "========================================"
cd csp
chmod +x gradlew
./gradlew checkstyleMain
./gradlew spotbugsMain
./gradlew pmdMain

echo ""
echo "========================================"
echo "  Java Tests"
echo "========================================"
./gradlew test

cd ..

echo ""
echo "========================================"
echo "  JavaScript Lint & Format Check"
echo "========================================"
cd cp
npm install
npm run format
npm run lint
npm run format:check

echo ""
echo "========================================"
echo "  JavaScript Tests"
echo "========================================"
npm test

echo ""
echo "========================================"
echo "  npm audit"
echo "========================================"
npm audit --audit-level=high || true

echo ""
echo "========================================"
echo "  All checks passed!"
echo "========================================"
