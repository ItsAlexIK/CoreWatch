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

## 📦 Requirements

- Node.js 18 or higher
- A Discord bot token
- A Raspberry Pi 5 (or any Linux system with `/proc` access)
- A Discord channel ID where stats will be posted

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
DISCORD_CHANNEL_ID=your-discord-channel-id
```

3. Run the bot:

```
node index.js
```

## 📬 Connect 

- [Discord](https://discord.com/users/551023598203043840)
- [GitHub](https://github.com/ItsAlexIK)

---

> Made with ❤️ by ItsAlexIK
