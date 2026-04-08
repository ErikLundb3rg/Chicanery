#!/bin/bash
set -e

APP_NAME="Chicanery"
INSTALL_DIR="$HOME/.local/share/chicanery"
APP_DIR="/Applications/$APP_NAME.app"

echo "Installing $APP_NAME..."

# Check for bun
if ! command -v bun &> /dev/null; then
  echo "Bun is required. Installing via curl..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull
else
  echo "Cloning repository..."
  git clone https://github.com/ErikLundb3rg/Chicanery.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install dependencies and build
bun install
bun run build

# Create .app bundle
echo "Creating $APP_NAME.app..."
rm -rf "$APP_DIR"

ELECTRON_APP="$INSTALL_DIR/node_modules/electron/dist/Electron.app"
cp -R "$ELECTRON_APP" "$APP_DIR"

# Point the app at our code
RESOURCES="$APP_DIR/Contents/Resources"
rm -rf "$RESOURCES/default_app.asar"
mkdir -p "$RESOURCES/app"
cp -R dist "$RESOURCES/app/dist"
cp -R resources "$RESOURCES/app/resources"
cp package.json "$RESOURCES/app/package.json"

# Copy native module
mkdir -p "$RESOURCES/app/node_modules/better-sqlite3"
cp -R node_modules/better-sqlite3 "$RESOURCES/app/node_modules/better-sqlite3"
# bindings is a dependency of better-sqlite3
mkdir -p "$RESOURCES/app/node_modules/bindings"
cp -R node_modules/bindings "$RESOURCES/app/node_modules/bindings"
mkdir -p "$RESOURCES/app/node_modules/file-uri-to-path"
cp -R node_modules/file-uri-to-path "$RESOURCES/app/node_modules/file-uri-to-path"

# Rename the binary
mv "$APP_DIR/Contents/MacOS/Electron" "$APP_DIR/Contents/MacOS/$APP_NAME"
sed -i '' "s/Electron/$APP_NAME/g" "$APP_DIR/Contents/Info.plist"

echo ""
echo "Installed to $APP_DIR"
echo "Open it from Applications or run: open '$APP_DIR'"
