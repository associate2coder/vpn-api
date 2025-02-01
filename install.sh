#!/bin/bash

# Exit on errors
set -e

# Variables
REPO_URL="https://github.com/associate2coder/vpn-api.git"
INSTALL_DIR="/opt/wireguard-api"
SERVICE_FILE="/etc/systemd/system/wireguard-api.service"
SERVER_IP=$(curl -s https://api64.ipify.org)

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing required packages..."
sudo apt install -y wireguard qrencode nodejs npm git

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
sudo systemctl start wireguard-api

echo "Installation complete!"
echo "Your WireGuard API is running on http://$SERVER_IP:3000"