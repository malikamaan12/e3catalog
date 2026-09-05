#!/usr/bin/env bash
# ==============================================================================
# E3 Rentals Qatar — Automated Ubuntu Server Provisioning Script
# Target: Ubuntu 22.04 / 24.04 LTS (AWS, GCP, Hetzner, DigitalOcean)
# ==============================================================================

set -euo pipefail

# Require root privileges
if [ "$EUID" -ne 0 ]; then
  echo "[-] ERROR: This script must be run as root or with sudo." >&2
  exit 1
fi

echo "===================================================================="
echo "  E3 Rentals Qatar — Initializing Production Host Provisioning"
echo "===================================================================="

# 1. Update and Upgrade Base System
echo "[+] Step 1/7: Updating base system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# 2. Install Core Utilities
echo "[+] Step 2/7: Installing essential system tools..."
apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    jq \
    unzip \
    tar \
    cron

# 3. Configure Swap Space (Prevents OOM during Next.js Docker builds on 2-4GB instances)
echo "[+] Step 3/7: Checking and configuring swap file..."
SWAP_SIZE=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$SWAP_SIZE" -lt 1024 ]; then
    echo "[+] Creating 2GB swapfile..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    # Set swappiness to optimal server value
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.d/99-e3-swap.conf
    echo "[+] Swap configured successfully."
else
    echo "[*] Sufficient swap space already present (${SWAP_SIZE} MB)."
fi

# 4. Install Official Docker Engine & Docker Compose Plugin
echo "[+] Step 4/7: Installing official Docker Engine & Compose..."
if ! command -v docker &> /dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    echo "[+] Docker Engine installed."
else
    echo "[*] Docker Engine already installed."
fi

# Configure Docker daemon log rotation to prevent disk exhaustion
cat << 'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
EOF
systemctl restart docker

# 5. Configure Hardened UFW Firewall
echo "[+] Step 5/7: Configuring UFW firewall rules..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Let’s Encrypt'
ufw allow 443/tcp comment 'HTTPS Production'
ufw --force enable
echo "[+] UFW firewall enabled (Ports 22, 80, 443 open)."

# 6. Configure Fail2ban SSH Protection
echo "[+] Step 6/7: Configuring Fail2ban intrusion prevention..."
cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = 22
EOF
systemctl enable fail2ban
systemctl restart fail2ban
echo "[+] Fail2ban jail activated."

# 7. Setup Application Directory Structure
echo "[+] Step 7/7: Preparing application folders in /opt/e3-rentals..."
mkdir -p /opt/e3-rentals
mkdir -p /opt/e3-rentals/deploy/nginx
mkdir -p /opt/e3-rentals/deploy/backups
mkdir -p /opt/e3-rentals/deploy/scripts
chmod 750 /opt/e3-rentals/deploy/backups

echo "===================================================================="
echo "  Host Provisioning Complete!"
echo "  Next steps:"
echo "    1. Clone repo into /opt/e3-rentals"
echo "    2. Copy .env.production.example to .env.production and set credentials"
echo "    3. Run ./deploy/scripts/deploy.sh"
echo "===================================================================="
