#!/bin/bash
set -e

echo "=== Step 1: Building React frontend ==="
npm ci
npx vite build
echo "Frontend built! Contents of dist/:"
ls -la dist/

echo "=== Step 2: Copying frontend to api-rust/static ==="
mkdir -p api-rust/static
cp -r dist/* api-rust/static/
echo "Static files copied:"
ls -la api-rust/static/

echo "=== Step 3: Installing Rust ==="
if ! command -v cargo &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    . "$HOME/.cargo/env"
fi

echo "=== Step 4: Building Rust backend (release) ==="
cd api-rust
cargo build --release

echo "=== Build complete! ==="
echo "Static files at api-rust/static/:"
ls -la static/
