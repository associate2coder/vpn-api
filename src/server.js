const express = require("express");
const fs = require("fs-extra");
const { execSync } = require("child_process");
const QRCode = require("qrcode");

const app = express();
const port = 3000;

// Automatically detect subnet
const detectSubnet = () => {
  try {
      const ip = execSync(`ip -4 addr show ${WG_INTERFACE} | grep -oP '(?<=inet\\s)\\d+\\.\\d+\\.\\d+\\.'`).toString().trim();
      return ip || "10.0.0."; // Fallback if detection fails
  } catch {
      return "10.0.0."; // Default if detection fails
  }
};
const BASE_IP = detectSubnet();
const WG_CONFIG_PATH = "/etc/wireguard/wg0.conf";
const WG_INTERFACE = "wg0";
const SUBNET_MASK = "/24";
const DNS_SERVER = "8.8.8.8";
const SERVER_IP = execSync("curl -s https://api64.ipify.org")
    .toString().trim();

const SERVER_PORT = 51820;

// Middleware to parse JSON requests
app.use(express.json());

// Function to execute shell commands
const runCommand = (command) => execSync(command).toString().trim();

// **1. API: Setup WireGuard Server**
app.get("/setup-server", (req, res) => {
    try {
      // Check if WireGuard is already running
      try {
        runCommand(`wg show ${WG_INTERFACE}`);

        return res.json({ message: "WireGuard server is already configured and running." });
      } catch {}

        // Generate server key pair
        const serverPrivateKey = runCommand("wg genkey");
        const serverPublicKey = runCommand(`echo "${serverPrivateKey}" | wg pubkey`);

        // Write initial config
        const configContent = `[Interface]
PrivateKey = ${serverPrivateKey}
Address = ${BASE_IP}1${SUBNET_MASK}
ListenPort = ${SERVER_PORT}
SaveConfig = true
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
DNS = ${DNS_SERVER}
`;

        // Save config
        fs.writeFileSync(WG_CONFIG_PATH, configContent);

        // Enable and start WireGuard
        runCommand(`systemctl start wg-quick@${WG_INTERFACE}`);

        res.json({ message: "WireGuard server setup complete!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// **2. API: Add a New Peer**
app.get("/add-peer", async (req, res) => {
    try {
        const privateKey = runCommand("wg genkey");
        const publicKey = runCommand(`echo "${privateKey}" | wg pubkey`);
        const serverPublicKey = runCommand(`wg show ${WG_INTERFACE} public-key`);

        // Check if the peer already exists
        const currentPeers = runCommand(`wg show ${WG_INTERFACE} peers`);

        if (currentPeers.includes(publicKey)) {
            return res.json({ message: "Peer already exists." });
        }        

        // Find next available IP
        const config = fs.readFileSync(WG_CONFIG_PATH, "utf8");
        const usedIPs = config.match(/10\.0\.0\.\d+/g) || [];
        let nextIP = 2;
        while (usedIPs.includes(BASE_IP + nextIP)) {
            nextIP++;
        }
        const clientIP = BASE_IP + nextIP;

        // Append peer to WireGuard config
        const peerEntry = `\n[Peer]\nPublicKey = ${publicKey}\nAllowedIPs = ${clientIP}/32\n`;
        fs.appendFileSync(WG_CONFIG_PATH, peerEntry);

        // Apply WireGuard changes
        runCommand(`wg set ${WG_INTERFACE} peer ${publicKey} allowed-ips ${clientIP}/32`);
        runCommand(`systemctl restart wg-quick@${WG_INTERFACE}`);

        // Generate client config
        const clientConfig = `[Interface]
PrivateKey = ${privateKey}
Address = ${clientIP}${SUBNET_MASK}
DNS = ${DNS_SERVER}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${SERVER_IP}:${SERVER_PORT}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;

        // Generate QR Code
        const qrCodeData = await QRCode.toDataURL(clientConfig);

        res.json({
            message: "Peer added successfully!",
            ip: clientIP,
            config: clientConfig,
            qrCode: qrCodeData,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// **3. API: Remove a Peer**
app.delete("/remove-peer", (req, res) => {
    try {
        const { publicKey } = req.body;
        if (!publicKey) {
            return res.status(400).json({ error: "Missing 'publicKey' in request body" });
        }

        // Check if the peer exists before trying to remove (MODIFIED)
        const currentPeers = runCommand(`wg show ${WG_INTERFACE} peers`);

        if (!currentPeers.includes(publicKey)) {
            return res.json({ message: "Peer does not exist or was already removed." });
        }

        // Remove peer from WireGuard
        runCommand(`wg set ${WG_INTERFACE} peer ${publicKey} remove`);

        // Remove peer entry from config file
        const config = fs.readFileSync(WG_CONFIG_PATH, "utf8");
        const updatedConfig = config.replace(new RegExp(`\\[Peer\\]\\nPublicKey = ${publicKey}\\nAllowedIPs = .*\\n`, "g"), "");
        fs.writeFileSync(WG_CONFIG_PATH, updatedConfig);

        // Restart WireGuard
        runCommand(`systemctl restart wg-quick@${WG_INTERFACE}`);

        res.json({ message: "Peer removed successfully!", publicKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Express server
app.listen(port, () => {
    console.log(`WireGuard API is running on http://localhost:${port}`);
});
