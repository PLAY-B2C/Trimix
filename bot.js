const mineflayer = require('mineflayer');

const config = {
  host: 'EternxlsSMP.aternos.me',
  port: 48918,
  username: 'notAreeb',
  password: '/login 3043AA',
  version: '1.21.4', // Force version to avoid protocol -1 error
  reconnectDelay: 30000 // 30 seconds
};

let bot;
let reconnecting = false;

function createBot() {
  console.log('🔁 Attempting to connect...');

  try {
    bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      version: config.version
    });

    bot.once('spawn', () => {
      reconnecting = false;
      console.log('✅ Bot spawned. Staying AFK...');

      // Auto-login
      setTimeout(() => {
        bot.chat(config.password);
      }, 1000);

      // Jump every 40 seconds
      setInterval(() => {
        if (!bot || !bot.entity) return;
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }, 40000);

      // Random chat every 5 minutes
      setInterval(() => {
        if (!bot || !bot.chat) return;
        const msg = ["Why are you so gay", "Wanna become my Gaylord?"];
        bot.chat(msg[Math.floor(Math.random() * msg.length)]);
      }, 300000);
    });

    bot.on('end', handleDisconnect);
    bot.on('error', handleDisconnect);
  } catch (e) {
    console.log('❌ Bot crashed:', e.message);
    scheduleReconnect();
  }
}

function handleDisconnect(err) {
  console.log(`❌ Bot disconnected: ${err?.message || 'unknown reason'}`);
  scheduleReconnect();
}

function scheduleReconnect() {
  if (reconnecting) return;
  reconnecting = true;
  console.log(`⏳ Reconnecting in ${config.reconnectDelay / 1000}s...`);
  setTimeout(() => createBot(), config.reconnectDelay);
}

createBot();
