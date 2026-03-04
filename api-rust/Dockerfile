# ---- Stage 1: Build Frontend ----
FROM node:20-slim AS frontend

WORKDIR /frontend

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy frontend source and build
COPY index.html vite.config.js ./
COPY src/ src/
COPY public/ public/
RUN npx vite build

# ---- Stage 2: Build Rust Backend ----
FROM rust:1.83-slim AS builder

WORKDIR /app

# Install OpenSSL dev libs (needed by reqwest/native-tls)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY api-rust/Cargo.toml api-rust/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Copy actual source and rebuild
COPY api-rust/src/ src/
RUN touch src/main.rs && cargo build --release

# ---- Stage 3: Runtime ----
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary
COPY --from=builder /app/target/release/erm-api-rust .

# Copy the built frontend into ./static
COPY --from=frontend /frontend/dist ./static

ENV RUST_LOG=info
EXPOSE 3000

CMD ["./erm-api-rust"]
