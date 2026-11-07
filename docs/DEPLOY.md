# Rodstar PayOps: Deployment Guide (Hetzner Cloud VPS)

This guide documents the production deployment of Rodstar PayOps on a Hetzner Cloud VPS running Ubuntu 24.04 LTS.

**Production Domain:** `payops.rodstartechdevs.co.ke`

---

## 1. Server Prerequisites

- **Server:** Hetzner Cloud CX22 or CPX21 (Ubuntu 24.04 LTS x86_64)
- **Firewall:** Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **DNS Records:** Point `payops.rodstartechdevs.co.ke` (A record) to server public IPv4.

---

## 2. Docker & Compose Setup

```bash
# Update and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ufw certbot python3-certbot-nginx git

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

---

## 3. Clone & Environment Configuration

```bash
git clone https://github.com/rodstartech/payops.git /opt/rodstar-payops
cd /opt/rodstar-payops

# Copy production environment template
cp .env.example .env

# Generate secure secrets
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Update .env with generated keys, database credentials, and production values
nano .env
```

---

## 4. Launching the Stack

```bash
# Start all containers in detached mode
docker compose up -d --build

# Verify container health
docker compose ps

# Check backend migration status
docker compose exec backend alembic current
```

---

## 5. SSL / TLS Configuration (Let's Encrypt)

```bash
# Obtain Let's Encrypt SSL certificate
sudo certbot certonly --standalone -d payops.rodstartechdevs.co.ke --agree-tos -m devops@rodstartechdevs.co.ke

# Mount certificates into Nginx container via docker-compose.yml volumes:
# - /etc/letsencrypt/live/payops.rodstartechdevs.co.ke/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
# - /etc/letsencrypt/live/payops.rodstartechdevs.co.ke/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

---

## 6. Health & Verification Check

```bash
curl -I https://payops.rodstartechdevs.co.ke/health/live
curl -s https://payops.rodstartechdevs.co.ke/health/ready | jq .
```
