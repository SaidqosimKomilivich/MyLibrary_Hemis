# Build bosqichi
FROM rust:1.92.0 AS builder

WORKDIR /usr/src/app

# OS boglikliklarni ornatish
# TLS/SSL va pkg-config qo'shish (postgres va sqlx uchun)
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Rust loyiha fayllarini nusxalaymiz
COPY . .

# SQLX offline query larni yoqish
ENV SQLX_OFFLINE=true

# RELASE build qilish
RUN cargo build --release

# Ishga tushirish bosqichi
FROM debian:bookworm-slim

WORKDIR /app

# TLS va baza uchun kerakli boglikliklar
RUN apt-get update && \
    apt-get install -y openssl ca-certificates libssl-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Build qilingan binar faylni nusxalaymiz
COPY --from=builder /usr/src/app/target/release/backend /usr/local/bin/backend

# Kerak bo'lishi mumkin bo'lgan kataloglarni yaratamiz
RUN mkdir -p /app/uploads

# Port
EXPOSE 8080

# 0.0.0.0 qilinishi docker container qulog'ini ochish uchun kerak
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080

CMD ["backend"]
