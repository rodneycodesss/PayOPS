# Rodstar PayOps: Production Deployment Guide (Hetzner Cloud VPS)

This guide documents the end-to-end production deployment of Rodstar PayOps on a Hetzner Cloud VPS running Ubuntu 24.04 LTS.

- **Target Domain:** `payops.rodstartechdevs.co.ke`
- **Architecture:** FastAPI (Async Python 3.13) + PostgreSQL 16 + Redis 7 + React 18 / Vite (Nginx static bundle) + n8n automation worker + Let's Encrypt SSL.
- **Single Test Account:** `rodney@rodstartechdevs.co.ke` / `SecureRodstar2026!`

---

## 1. Server Provisioning & DNS

1. **Hetzner Cloud Server:** Create a server with CX22 (2 vCPU, 4 GB RAM, 40 GB NVMe) or CPX21 in Nuremberg or Falkenstein.
2. **Operating System:** Ubuntu 24.04 LTS.
3. **DNS Configuration:** In your DNS management console, create an **A Record**:
   ```
   payops.rodstartechdevs.co.ke  ->  <YOUR_HETZNER_VPS_IP>
   ```

---

## 2. Server Hardening & Dependencies

Connect to the server via SSH:
```bash
ssh root@<YOUR_HETZNER_VPS_IP>
```

Update system packages and configure UFW firewall:
```bash
apt update && apt upgrade -y
apt install -y curl ufw git certbot python3-certbot-nginx jq

# Configure Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Install Docker & Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
```

---

## 3. Clone Repository & Configure Environment

```bash
mkdir -p /opt/rodstar-payops
git clone https://github.com/rodstartech/payops.git /opt/rodstar-payops
cd /opt/rodstar-payops
```

Generate secure cryptographic keys:
```bash
# Generate JWT Secret Key
JWT_SECRET=$(openssl rand -hex 32)

# Generate Fernet Credential Encryption Key
FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Generate Database Password
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')
```

Create production `.env` file (`/opt/rodstar-payops/.env`):
```env
ENVIRONMENT=production
DEBUG=false
APP_NAME="Rodstar PayOps"
DOMAIN=payops.rodstartechdevs.co.ke

# Database & Cache
DATABASE_URL=postgresql+asyncpg://payops_user:${DB_PASSWORD}@postgres:5432/rodstar_payops
POSTGRES_USER=payops_user
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=rodstar_payops
REDIS_URL=redis://redis:6379/0

# Security Secrets
SECRET_KEY=${JWT_SECRET}
ENCRYPTION_KEY=${FERNET_KEY}
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Daraja M-PESA Integration
DARAJA_ENVIRONMENT=sandbox
DARAJA_CONSUMER_KEY=your_sandbox_consumer_key
DARAJA_CONSUMER_SECRET=your_sandbox_consumer_secret
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_CALLBACK_URL=https://payops.rodstartechdevs.co.ke/api/v1/payments/daraja/callback

# eTIMS Compliance
ETIMS_ENVIRONMENT=manual_review
ETIMS_DEFAULT_TAX_RATE=16.00

# n8n Automation Engine
N8N_ENCRYPTION_KEY=$(openssl rand -hex 16)
N8N_HOST=payops.rodstartechdevs.co.ke
N8N_PROTOCOL=https
```

---

## 4. SSL Certificate Generation (Let's Encrypt)

Obtain valid SSL certificates using Certbot:
```bash
certbot certonly --standalone -d payops.rodstartechdevs.co.ke --agree-tos -m devops@rodstartechdevs.co.ke
```

Set up automatic certificate renewal cron:
```bash
echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f /opt/rodstar-payops/docker-compose.yml exec nginx nginx -s reload'" | crontab -
```

---

## 5. Docker Compose Production Stack

Inspect `/opt/rodstar-payops/docker-compose.yml` to verify service definitions:
- **`postgres`:** PostgreSQL 16 Alpine with persisted volume `pgdata`.
- **`redis`:** Redis 7 Alpine with persisted volume `redisdata`.
- **`backend`:** FastAPI application container running Uvicorn workers (`--workers 4`).
- **`frontend`:** Multi-stage Nginx container serving compiled React SPA bundle and proxying `/api/` and `/health` requests.
- **`n8n`:** Orchestration worker running predefined Kenyan payment automation workflows.

Start the entire production cluster:
```bash
cd /opt/rodstar-payops
docker compose up -d --build
```

Verify service health:
```bash
docker compose ps
```

---

## 6. Database Migrations & Initial Setup

Run Alembic database migrations to establish the schema:
```bash
docker compose exec backend alembic upgrade head
```

Verify current Alembic head:
```bash
docker compose exec backend alembic current
```

---

## 7. Verification & Sanity Checks

Test API liveness and readiness probes:
```bash
curl -I https://payops.rodstartechdevs.co.ke/health/live
curl -s https://payops.rodstartechdevs.co.ke/health/ready | jq .
```

Verify frontend web application:
Open `https://payops.rodstartechdevs.co.ke` in any web browser and log in with the test credentials:
- **Email:** `rodney@rodstartechdevs.co.ke`
- **Password:** `SecureRodstar2026!`

---

## 8. Backup & Maintenance

Automated daily backup of PostgreSQL database:
```bash
# Add to crontab
0 2 * * * docker compose -f /opt/rodstar-payops/docker-compose.yml exec -T postgres pg_dump -U payops_user rodstar_payops | gzip > /opt/backups/payops_$(date +\%F).sql.gz
```
