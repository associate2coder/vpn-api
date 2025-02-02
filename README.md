# 📡 WireGuard VPN API Documentation

## 1️⃣ Introduction

Welcome to the **WireGuard VPN API**, a lightweight and easy-to-use API for managing a WireGuard VPN server. This API allows you to:

- ✅ **Set up a WireGuard VPN server** automatically.
- ✅ **Add new peers** dynamically and generate QR codes for easy client setup.
- ✅ **Remove peers** when no longer needed.
- ✅ **Manage VPN connections** via HTTP requests.

### 🎯 Features
- 🛠 **Automated WireGuard setup** – Deploy a fully working VPN in minutes.
- 🔑 **Dynamic peer management** – Add or remove peers via API.
- 📲 **QR code generation** – Easily configure clients with a simple scan.
- 🔄 **Persistent API service** – Runs in the background as a system service.

### 📌 Prerequisites
Before using this API, ensure:
- You have a **Linux server** (Ubuntu recommended).
- You have **root or sudo access** to install WireGuard.
- Your server has a **public IP** for client connections.

🚀 Continue to the **Installation** section to set up the API!

## 2️⃣ Installation

This section provides step-by-step instructions to set up your WireGuard VPN API on a fresh Linux server.

### 📌 Requirements
- A **Linux server** (Ubuntu/Debian recommended).
- **Root or sudo access** to install dependencies.
- **WireGuard-compatible clients** (e.g., WireGuard mobile app or desktop client).

---

### 🚀 **Quick One-Command Installation**
Run the following command on your **Linux server** to install and configure the WireGuard API automatically:

```bash
bash <(curl -s https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/YOUR_REPO/main/install.sh)
