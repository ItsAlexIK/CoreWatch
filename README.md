# 🖥️ Discord System Monitor Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight Discord bot designed to monitor system stats from a Raspberry Pi 5 (or any Linux-based machine). The bot periodically sends a live system status update to a selected Discord channel, including CPU load, memory usage, temperature, disk usage, and uptime.

## ✨ Features

- Live system stats updated in real time
- Details include:
  - 🧠 RAM usage
  - 🔥 CPU temperature
  - ⚙️ CPU usage
  - 💾 Disk space used
  - ⏱️ System uptime
  - `/htop` command to display an interactive process list directly in Discord (like the Linux `htop`)

 ![Status](.github/assets/status.png)

## 💻 `/htop` Command

Use the `/htop` command to view a live list of the most resource-intensive processes on your machine.

- Shows unique processes sorted by CPU usage
- Displays:
  - 🔹 PID
  - 🖥️ CPU usage
  - 📊 Memory usage
- Includes interactive buttons to navigate between pages
- Output is styled to be Discord-friendly and readable

![Active processes](.github/assets/htop-preview.png)

## 🛡️ Permission Restriction for `/htop` Command

The `/htop` command is restricted to a specific Discord user ID for security reasons. Only the designated user can run this command to view system processes.

To specify who can run the command, set the environment variables `ALLOWED_USER_ID` and/or `ALLOWED_ROLE_ID` in your .env file (logical OR if both are set).

## 📦 Requirements

- Node.js 18 or higher
- A Discord bot token
- A Raspberry Pi 5 (or any Linux system with `/proc` access)

## 🔧 Setup

### Option A: Docker (prebuilt image)

```bash
# Pull the latest image
docker pull ghcr.io/itsalexik/corewatch:latest

# Run with required environment variables (set your real values)
docker run -d --name corewatch --restart unless-stopped \
  --pid=host \
  -v /proc:/proc:ro \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CHANNEL_ID=your_channel_id \
  -e DISCORD_GUILD_ID=your_guild_id \
  -e DISCORD_CLIENT_ID=your_client_id \
  -e ALLOWED_USER_ID=allowed_user_id_optional \
  -e ALLOWED_ROLE_ID=allowed_role_id_optional \
  ghcr.io/itsalexik/corewatch:latest
```

### Option B: Docker (build locally)

```bash
git clone https://github.com/ItsAlexIK/CoreWatch
cd CoreWatch
docker build -t corewatch .

docker run -d --name corewatch --restart unless-stopped \
  --pid=host \
  -v /proc:/proc:ro \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CHANNEL_ID=your_channel_id \
  -e DISCORD_GUILD_ID=your_guild_id \
  -e DISCORD_CLIENT_ID=your_client_id \
  -e ALLOWED_USER_ID=allowed_user_id_optional \
  -e ALLOWED_ROLE_ID=allowed_role_id_optional \
  corewatch
```

### Option C: Run from source

```bash
git clone https://github.com/ItsAlexIK/CoreWatch.git
cd CoreWatch
npm install

# Copy env template and fill in your values
cp .env.example .env
# Open .env and fill in your values

# Start the bot
node index.js
```

## 🚀 Auto-run at Startup (from source)

Set the bot to start automatically on boot.

1. Create the service file  
```
sudo nano /etc/systemd/system/corewatch.service
```

2. Paste and adjust (set WorkingDirectory, ExecStart path to your Node binary if different, and User)
```
[Unit]
Description=CoreWatch Discord Bot
After=network.target

[Service]
WorkingDirectory=/root/CoreWatch
ExecStart=/usr/bin/node index.js
Restart=always
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service
```
sudo systemctl daemon-reload
sudo systemctl enable corewatch.service
sudo systemctl start corewatch.service
```

4. Verify it is running
```
systemctl status corewatch.service
```

5. View logs (Ctrl+C to exit)
```
journalctl -u corewatch.service -f
```

To stop:
```
sudo systemctl stop corewatch.service
```

To restart after changes:
```
sudo systemctl restart corewatch.service
```


## 📬 Connect 

- [Discord](https://discord.com/users/551023598203043840)
- [GitHub](https://github.com/ItsAlexIK)

---

> Made with ❤️ by ItsAlexIK
