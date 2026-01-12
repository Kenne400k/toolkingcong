#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================"
echo "   KingCong TTS Tool - Linux/macOS"
echo -e "========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  macOS (Homebrew):"
        echo "    brew install node"
        echo ""
        echo "  Or download from: https://nodejs.org/"
    else
        echo "  Ubuntu/Debian:"
        echo "    sudo apt update && sudo apt install nodejs npm"
        echo ""
        echo "  Fedora/RHEL:"
        echo "    sudo dnf install nodejs npm"
        echo ""
        echo "  Arch Linux:"
        echo "    sudo pacman -S nodejs npm"
        echo ""
        echo "  Or download from: https://nodejs.org/"
    fi
    echo ""
    exit 1
fi

# Show Node version
NODE_VER=$(node -v)
echo -e "${GREEN}[OK]${NC} Node.js version: $NODE_VER"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed!${NC}"
    exit 1
fi

NPM_VER=$(npm -v)
echo -e "${GREEN}[OK]${NC} npm version: $NPM_VER"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}[INFO] Installing dependencies...${NC}"
    echo "This may take a few minutes on first run."
    echo ""

    npm install

    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}[OK] Dependencies installed successfully!${NC}"
fi

# Start app
echo ""
echo -e "${BLUE}[INFO] Starting KingCong TTS Tool...${NC}"
echo ""

npm start

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Application crashed or failed to start.${NC}"
    exit 1
fi
