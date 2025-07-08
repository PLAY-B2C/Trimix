const mineflayer = require('mineflayer');

const config = {
  host: 'EternxlsSMP.aternos.me',
  port: 48918,
  username: 'notAreeb',
  password: '/login 3043AA',
  reconnectDelay: 30000 // 30 seconds
};

let reconnecting = false;
let bot;

function createBot() {
  console.log('🔁 Attempting to connect...');
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username
  });

  bot.once('spawn', () => {
    reconnecting = false;
    console.log('✅ Bot spawned. Staying AFK...');

    // Auto-login with password
    setTimeout(() => {
      bot.chat(config.password);
    }, 1000);

    // Jump every 40 seconds
    setInterval(() => {
      if (!bot || !bot.entity) return;
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 300);
    }, 40000);

    // Send random AFK chat every 5 minutes
    setInterval(() => {
      if (!bot || !bot.chat) return;
      const msg = ["Why are you so gay", "Wanna become my Gaylord?"];
      bot.chat(msg[Math.floor(Math.random() * msg.length)]);
    }, 300000);
  });

  bot.on('end', handleDisconnect);
  bot.on('error', handleDisconnect);
}

function handleDisconnect(err) {
  console.log(`❌ Bot disconnected: ${err?.message || 'unknown reason'}`);
  if (reconnecting) return; // prevent multiple timers
  reconnecting = true;
  console.log(`⏳ Reconnecting in ${config.reconnectDelay / 1000}s...`);
  setTimeout(() => createBot(), config.reconnectDelay);
}

createBot();
