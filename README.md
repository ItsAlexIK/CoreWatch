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

 ![Status](./assets/status.png)

## 💻 `/htop` Command

Use the `/htop` command to view a live list of the most resource-intensive processes on your machine.

- Shows unique processes sorted by CPU usage
- Displays:
  - 🔹 PID
  - 🖥️ CPU usage
  - 📊 Memory usage
- Includes interactive buttons to navigate between pages
- Output is styled to be Discord-friendly and readable

![Active processes](./assets/htop-preview.png)

## 🛡️ Permission Restriction for `/htop` Command

The `/htop` command is restricted to a specific Discord user ID for security reasons. Only the designated user can run this command to view system processes.

The command code is located at [`src/commands/htop.js`](./src/commands/htop.js).
To specify who can run the command, update the `ALLOWED_USER_ID` or `ALLOWED_ROLE_ID` constants in `src/commands/htop.js`:
- If both are set, the command will allow access if the user matches either the user ID or the role ID (logical OR).


```js
const ALLOWED_USER_ID = "123456789012345678"; // REPLACE WITH YOUR USER ID
const ALLOWED_ROLE_ID = "123456789012345678"; // REPLACE WITH YOUR ROLE ID
```

## 📦 Requirements

- Node.js 18 or higher
- A Discord bot token
- A Raspberry Pi 5 (or any Linux system with `/proc` access)

## 🔧 Setup

1. Clone the repository:

```
git clone https://github.com/ItsAlexIK/CoreWatch.git
cd CoreWatch
npm install
```

2. Create a `.env` file in the project root with the following content:

```
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=client_id_here
DISCORD_GUILD_ID=guild_id_here
DISCORD_CHANNEL_ID=your-discord-channel-id
```

3. Run the bot:

```
node index.js
```

## 🚀 Auto-run at Startup (systemd)

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
