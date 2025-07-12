const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');

const config = {
  host: 'EternxlsSMP.aternos.me',
  port: 48918,
  username: 'Anouncement',
  version: '1.20.4',
  loginCommand: '/login 3043AA',
};

let chatMessages = [];
try {
  chatMessages = fs.readFileSync('./botchat.txt', 'utf-8')
    .split('\n')
    .filter(line => line.trim() !== '');
} catch (err) {
  console.error('❌ Failed to load botchat.txt:', err);
}

let bot;
let connecting = false;

function pingServerAndConnect() {
  if (connecting) return;
  connecting = true;

  console.log(`🔁 Pinging server ${config.host}...`);
  mc.ping({ host: config.host, port: config.port }, (err, result) => {
    if (err || !result || result.version.name.includes('Offline')) {
      console.log('❌ Server offline. Retrying in 10s...');
      connecting = false;
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
    version: config.version,
  });

  bot.once('spawn', () => {
    console.log('✅ Bot spawned. Staying AFK...');
    if (config.loginCommand && typeof bot.chat === 'function') {
      setTimeout(() => bot.chat(config.loginCommand), 1000);
    }
    loopRandomMessages();
  });

  bot.on('error', err => {
    console.error(`❌ Bot error: ${err.code}`);
    reconnect();
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    reconnect();
  });
}

function reconnect() {
  connecting = false;
  setTimeout(pingServerAndConnect, 10000);
}

function loopRandomMessages() {
  setInterval(() => {
    if (bot && bot.player && chatMessages.length > 0) {
      const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
      bot.chat(msg);
    }
  }, 5 * 60 * 1000);
}

pingServerAndConnect();
