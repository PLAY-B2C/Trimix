# IamChatGPT# IamChatGPT 🎣 - Advanced Minecraft AFK Fishing Bot

A powerful Mineflayer bot that automates AFK fishing with intelligent features such as auto-eating, chest management, and reconnect. Ideal for long-term survival/farming setups on Minecraft 1.21.4 servers.

## 🌐 Server Info
- **IP**: `EternxlsSMP.aternos.me`
- **Port**: `48918`
- **Version**: `1.21.4`
- **Bot Username**: `IamChatGPT`
- **Password Command**: `/login 3043AA`

---

## 🚀 Features
- 🎣 Fully automated fishing using note-block farm design ([See YouTube](https://youtu.be/bFLX6il7pyw?si=bgAgtY5LyEzDXaLl))
- 🥖 Auto-eats bread from nearby **barrel**, always equips in 9th slot
- 📦 Auto-dumps caught items into **double chests** (avoids barrel)
- 🧠 Logs caught items in chat: `🎣 Caught: enchanted_book (mending)`
- 🔁 Auto-reconnect if disconnected
- 🦘 Jumps every 60 seconds to prevent AFK kick

---

## 📦 Installation (Termux)
```bash
pkg install nodejs git -y
git clone https://github.com/PLAY-B2C/IamChatGPT.git
cd IamChatGPT
npm install
node bot.js
