// bot.js
const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'EternxlsSMP.aternos.me',
  port: 48918,
  username: 'IamChatGPT',
  version: false,
  loginCommand: '/login 3043AA',
};

// Load chat messages from botchat.txt
const chatMessages = fs
  .readFileSync(path.join(__dirname, 'botchat.txt'), 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);

let bot;

function pingServerAndConnect() {
  console.log(`🔁 Pinging server ${config.host}...`);
  mc.ping({ host: config.host, port: config.port }, (err, result) => {
    if (err || !result || result.version.name.includes('Offline')) {
      console.log(`❌ Server offline. Retrying in 10s...`);
      return setTimeout(pingServerAndConnect, 10000);
    }

    console.log(`✅ Server is online. Version: ${result.version.name}`);
    connectBot();
  });
}

function connectBot() {
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
  });

  bot.on('login', () => {
    console.log(`✅ Bot spawned. Staying AFK...`);
    bot.chat(config.loginCommand);
    loopRandomMessages();
  });

  bot.on('chat', (username, message) => {
    if (username.toLowerCase() === bot.username.toLowerCase()) return;

    const msg = message.toLowerCase();
    if (msg.includes('hi') || msg.includes('hello')) {
      bot.chat('what r u doin');
    }
  });

  bot.on('error', err => {
    console.error(`❌ Bot error: ${err.code}`);
    setTimeout(pingServerAndConnect, 10000);
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    setTimeout(pingServerAndConnect, 10000);
  });
}

function loopRandomMessages() {
  setInterval(() => {
    if (bot && bot.chat) {
      const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
      bot.chat(msg);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}

pingServerAndConnect();
