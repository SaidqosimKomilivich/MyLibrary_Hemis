# 📚 MyLibrary — Production Deployment Guide

> **Stack:** Rust (Actix-Web) + PostgreSQL + React/Vite/TypeScript + Nginx + Docker Compose  
> **Backend port:** `8087` (internal, proxied via Nginx)  
> **Frontend port:** `5176` (exposed to host)  

---

## 📋 Deployment Steps

### 1. Update the Code
Navigate to the project directory and fetch the latest changes:
```bash
cd /path/to/library_full
git pull origin main
```

### 2. Configure Environment
Ensure your `backend/.env` is configured correctly with your database credentials and secrets.

**`backend/.env`**:
```dotenv
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_DB_PASSWORD
POSTGRES_DB=kutubxona_db

# PGPASSWORD - for pg_dump backup
PGPASSWORD=YOUR_DB_PASSWORD

# Backend — Database connection (URL-encode special chars in password)
DATABASE_URL=postgres://postgres:YOUR_DB_PASSWORD@db:5432/kutubxona_db

# JWT & Auth
JWT_SECRET=YOUR_SECRET_KEY
ACCESS_TOKEN_EXPIRY_MINUTES=80
REFRESH_TOKEN_EXPIRY_DAYS=7

SERVER_HOST=0.0.0.0
SERVER_PORT=8087
RUST_LOG=info

# Admin Seeder
ADMIN_LOGIN=superadmin
ADMIN_PAROL=YOUR_ADMIN_PASSWORD
ADMIN_NAME="Begimqulov Saidqosim"

# HEMIS API
HEMIS_BASE_URL=https://student.jbnuu.uz
HEMIS_TOKEN=YOUR_HEMIS_TOKEN
```

### 3. Build & Start Containers
Use the deployment script to rebuild and start the containers. This script will safely stop old containers, build the new images, and bring them up.

```bash
bash deploy.sh
```

Alternatively, you can run the Docker Compose commands manually:
```bash
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
```

### 4. Verify Services
Check if the containers are running and healthy:
```bash
docker compose ps
docker compose logs -f --tail=50
```

---

## 🌐 Host Nginx Configuration (For Existing Servers)

Since your server already has running projects, you can add a new Nginx server block specifically for this application without affecting your other sites.

Create a new configuration file for this project:
```bash
sudo nano /etc/nginx/sites-available/mylibrary
```

Paste the following configuration (replace `yourdomain.uz` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.uz www.yourdomain.uz;

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

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mylibrary /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

If you use Certbot for SSL, run it specifically for your new domain so it doesn't touch other projects:
```bash
sudo certbot --nginx -d yourdomain.uz -d www.yourdomain.uz
```

---

## 💾 Database Backups

The `db-backup` container runs automatically every **Sunday at 05:00** to create a backup in the `backups/` directory.

To run a backup manually:
```bash
docker exec kutubxona_db_backup sh /backup.sh
```

To restore from a backup:
```bash
docker compose stop backend
docker exec -i kutubxona_db pg_restore -U postgres -d kutubxona_db --clean --if-exists < ./backups/YOUR_DUMP_FILE.dump
docker compose start backend
```
