const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol'); // for ping

const config = {
  host: 'javelin.aternos.host',
  port: 48918,
  username: 'LisaMC',
  version: '1.21.4',
  password: '/login 3043AA',
  reconnectDelay: 30000 // 30s
};

let bot;
let reconnecting = false;
let intervals = [];

function createBot() {
  if (reconnecting) return; // Prevent stacked calls
  reconnecting = true;

  console.log(`🔁 Pinging server ${config.host}...`);

  mc.ping({ host: config.host, port: config.port }, (err, res) => {
    if (err || !res) {
      console.log('❌ Server offline. Retrying in 30s...');
      return setTimeout(() => {
        reconnecting = false;
        createBot();
      }, config.reconnectDelay);
    }

    console.log(`✅ Server is online. Version: ${res.version.name}`);
    console.log('🔌 Connecting bot...');

    bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      version: config.version
    });

    bot.once('spawn', () => {
      reconnecting = false;
      console.log('✅ Bot spawned. Staying AFK...');

      // Auto login
      setTimeout(() => bot.chat(config.password), 1000);

      // AFK jumping
      intervals.push(setInterval(() => {
        if (!bot || !bot.entity) return;
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }, 40000));

      // AFK chat
      intervals.push(setInterval(() => {
        if (!bot || !bot.chat) return;
        const msgs = [
          "Why are you so gay 💅",
          "Wanna become my Gaylord? 😘"
        ];
        bot.chat(msgs[Math.floor(Math.random() * msgs.length)]);
      }, 300000));
    });

    bot.on('end', () => {
      console.log('❌ Disconnected. Retrying in 30s...');
      cleanupAndRetry();
    });

    bot.on('error', (err) => {
      console.log('❗ Error:', err.message);
      cleanupAndRetry();
    });
  });
}

function cleanupAndRetry() {
  reconnecting = false;
  if (bot) {
    try { bot.quit(); } catch {}
    bot = null;
  }
  intervals.forEach(clearInterval);
  intervals = [];
  setTimeout(() => createBot(), config.reconnectDelay);
}

createBot();
