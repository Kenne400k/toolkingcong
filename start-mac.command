#!/bin/bash

# This file is for macOS - double-click to run
# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Run the main start script
./start.sh
