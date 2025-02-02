#!/bin/bash

# Exit on errors
set -e

# Variables
REPO_URL="https://github.com/associate2coder/vpn-api.git"
INSTALL_DIR="/opt/wireguard-api"
SERVICE_FILE="/etc/systemd/system/wireguard-api.service"
SERVER_IP=$(curl -s https://api64.ipify.org)

# Detect network interface dynamically (first non-loopback, non-virtual)
INTERFACE=$(ip -o -4 route show default | awk '{print $5}')
if [[ -z "$INTERFACE" ]]; then
    echo "Error: No active network interface detected!" >&2
    exit 1
fi

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing required packages..."
sudo apt install -y wireguard qrencode nodejs npm git openresolv 

echo "Cloning WireGuard API from GitHub..."
sudo rm -rf $INSTALL_DIR
sudo git clone $REPO_URL $INSTALL_DIR
cd $INSTALL_DIR

echo "Installing Node.js dependencies..."
sudo npm install

echo "Creating systemd service..."
sudo tee $SERVICE_FILE > /dev/null <<EOL
[Unit]
Description=WireGuard API Service
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/src/server.js
Restart=always
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

echo "Enabling and starting WireGuard API service..."
sudo systemctl daemon-reload
sudo systemctl enable wireguard-api
sudo systemctl restart wireguard-api # [MODIFIED] Restart instead of start (ensures reloading)

# Enable packet forwarding for VPN clients
echo "Configuring IP forwarding..."
sudo tee /etc/sysctl.d/99-wireguard.conf > /dev/null <<EOL
net.ipv4.ip_forward = 1
EOL
sudo sysctl --system

# Configure NAT for WireGuard
echo "Setting up NAT for WireGuard..."
sudo iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -o $INTERFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i $INTERFACE -o wg0 -j ACCEPT

# [ADDED] Make iptables rules persistent
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
sudo netfilter-persistent reload

echo "Installation complete!"
echo "Your WireGuard API is running on http://$SERVER_IP:3000"