#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"

echo "=== Cleaning build directory ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# ─── Build Java CSP ──────────────────────────────────────────────────
# Uses java.toolchain in build.gradle to auto-provision JDK 17 for compilation
# while cross-compiling to Java 8 bytecode (options.release = 8)

echo ""
echo "=== Building Java Connected System Plugin (csp) ==="
cd "$SCRIPT_DIR/csp"
chmod +x gradlew
./gradlew clean build -x spotbugsMain -x spotbugsTest

# Copy the built jar to the build directory
CSP_JAR=$(find build/libs -name '*.jar' -not -name '*-sources.jar' | head -1)
if [ -z "$CSP_JAR" ]; then
  echo "ERROR: No JAR found in csp/build/libs/"
  exit 1
fi
cp "$CSP_JAR" "$BUILD_DIR/"
echo "  -> $(basename "$CSP_JAR") copied to build/"

# ─── Build Component Plugin (cp) ─────────────────────────────────────

echo ""
echo "=== Building Component Plugin (cp) ==="
cd "$SCRIPT_DIR/cp"

# Read version from appian-component-plugin.xml
VERSION=$(grep '<version>' appian-component-plugin.xml | head -1 | sed 's/.*<version>\(.*\)<\/version>.*/\1/')
ZIP_NAME="ComponentPlugin_Rich_Text_v${VERSION}.zip"

echo "  Version: $VERSION"

# Create a temp staging directory
STAGING_DIR=$(mktemp -d)
trap "rm -rf $STAGING_DIR" EXIT

# Copy only the runtime files that belong in the plugin zip
cp appian-component-plugin.xml "$STAGING_DIR/"
rsync -a --exclude='.DS_Store' richTextField/ "$STAGING_DIR/richTextField/"
rsync -a --exclude='.DS_Store' richTextFieldWithTables/ "$STAGING_DIR/richTextFieldWithTables/"

# Create the zip
cd "$STAGING_DIR"
zip -r "$BUILD_DIR/$ZIP_NAME" . -x '*.DS_Store'

echo "  -> $ZIP_NAME created in build/"

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Build complete ==="
echo "Artifacts in $BUILD_DIR/:"
ls -lh "$BUILD_DIR/"
