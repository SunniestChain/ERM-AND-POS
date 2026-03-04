# ---- Stage 1: Build ----
FROM rust:1.83-slim AS builder

WORKDIR /app

# Install OpenSSL dev libs (needed by reqwest/native-tls)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Copy actual source and rebuild
COPY src/ src/
RUN touch src/main.rs && cargo build --release

# ---- Stage 2: Runtime ----
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/erm-api-rust .

ENV RUST_LOG=info
EXPOSE 3000

CMD ["./erm-api-rust"]
