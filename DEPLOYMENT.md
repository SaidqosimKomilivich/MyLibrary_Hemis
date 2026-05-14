# 📚 MyLibrary — Production Deployment Guide

> **Stack:** Rust (Actix-Web) + PostgreSQL + React/Vite/TypeScript + Nginx + Docker Compose
> **Backend port:** `8087` (internal, proxied via Nginx container)
> **Frontend port:** `5176:80` (exposed to host, proxied via host Nginx)

---

## ✅ Pre-Deploy Checklist

Before deploying, verify the following in `backend/.env`:

| Variable | Requirement |
|---|---|
| `JWT_SECRET` | Minimum 32 characters, random string — **change from default!** |
| `POSTGRES_PASSWORD` | Strong password, no simple words |
| `ADMIN_PAROL` | Strong admin password |
| `HEMIS_TOKEN` | Valid token from HEMIS API |
| `CORS_ALLOWED_ORIGINS` | Set to your **production HTTPS domain** (see Step 2) |

---

## 📋 Deployment Steps

### 1. Update the Code

Navigate to the project directory and fetch the latest changes:

```bash
cd /path/to/library_full
git pull origin main
```

---

### 2. Configure Environment

Edit `backend/.env` with your production values:

```bash
nano backend/.env
```

**`backend/.env`** (production values):

```dotenv
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD
POSTGRES_DB=kutubxona_db

# PGPASSWORD - for pg_dump backup
PGPASSWORD=YOUR_STRONG_DB_PASSWORD

# Backend — Database connection (URL-encode special chars in password)
# Example: @ → %40, # → %23
DATABASE_URL=postgres://postgres:YOUR_STRONG_DB_PASSWORD@db:5432/kutubxona_db

# JWT & Auth — use a strong random secret (min 32 chars)
# Generate: openssl rand -hex 32
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET_MIN_32_CHARS
ACCESS_TOKEN_EXPIRY_MINUTES=80
REFRESH_TOKEN_EXPIRY_DAYS=7

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8087
RUST_LOG=info

# CORS — set to your production HTTPS domain (comma-separated, no spaces)
# ⚠️ Use https:// NOT http:// in production!
CORS_ALLOWED_ORIGINS=https://yourdomain.uz,https://www.yourdomain.uz

# Admin Seeder — credentials for the initial superadmin account
ADMIN_LOGIN=superadmin
ADMIN_PAROL=!2345678a
ADMIN_NAME="Kutubxona Admini"

# HEMIS API
HEMIS_BASE_URL=https://student.jbnuu.uz
HEMIS_TOKEN=YOUR_HEMIS_TOKEN
```

> **🔑 Generate a strong JWT secret:**
> ```bash
> openssl rand -hex 32
> ```

---

### 3. Build & Start Containers

Use the deployment script to rebuild and start the containers:

```bash
bash deploy.sh
```

Alternatively, run manually:

```bash
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
```

---

### 4. Verify Services

Check that all containers are running and healthy:

```bash
docker compose ps
docker compose logs -f --tail=50
```

Run a health check against the backend:

```bash
# From inside the server (via Nginx proxy)
curl -s http://localhost:5176/api/health

# Expected response:
# {"status":"ok","message":"Server ishlayapti"}
```

---

## 🌐 Host Nginx Configuration (HTTPS + SSL)

Your server must have **Nginx** and **Certbot** installed. Add a new server block for this project without touching your other sites.

### Step 1 — Create the Nginx config

```bash
sudo nano /etc/nginx/sites-available/mylibrary
```

Paste the following (replace `yourdomain.uz` with your actual domain):

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name yourdomain.uz www.yourdomain.uz;

    # Let's Encrypt challenge support
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS main server block
server {
    listen 443 ssl;
    server_name yourdomain.uz www.yourdomain.uz;

    # SSL certificates (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/yourdomain.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.uz/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Client upload limit (PDF, images)
    client_max_body_size 50M;

    location / {
        # Proxy to the Docker frontend container on port 5176
        proxy_pass         http://127.0.0.1:5176;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        # SSE / long-polling support
        proxy_buffering    off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### Step 2 — Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/mylibrary /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3 — Issue SSL certificate with Certbot

```bash
sudo certbot --nginx -d yourdomain.uz -d www.yourdomain.uz
```

Certbot will automatically update the Nginx config with your certificate paths.

### Step 4 — Verify HTTPS

```bash
curl -I https://yourdomain.uz/api/health
```

Expected: `HTTP/2 200` with `{"status":"ok",...}` body.

---

## 🔄 Re-deploying After Code Changes

```bash
cd /path/to/library_full
bash deploy.sh
```

The script will:
1. Pull latest code from Git
2. Stop old containers
3. Rebuild Docker images (no cache)
4. Start containers
5. Show container status

---

## 💾 Database Backups

The `db-backup` container runs automatically every **Sunday at 05:00** and saves a backup to the `backups/` directory.

**Run a backup manually:**

```bash
docker exec kutubxona_db_backup sh /backup.sh
```

**Restore from a backup:**

```bash
docker compose stop backend
docker exec -i kutubxona_db pg_restore -U postgres -d kutubxona_db --clean --if-exists < ./backups/YOUR_DUMP_FILE.dump
docker compose start backend
```

---

## 🛠️ Useful Commands

```bash
# View live logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Enter the backend container
docker exec -it kutubxona_backend bash

# Enter the database
docker exec -it kutubxona_db psql -U postgres -d kutubxona_db

# Check disk usage of volumes
docker system df -v
```

---

## 🔐 Security Notes

- **Never commit `backend/.env`** to Git — it contains real secrets. It is already in `.gitignore`.
- Rotate `JWT_SECRET` and `HEMIS_TOKEN` periodically.
- The database port (`5432`) is **not exposed** to the host — only accessible within Docker network.
- The backend port (`8087`) is **not exposed** to the host — only accessible through the frontend Nginx container.
