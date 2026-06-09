const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  originalWarn(msg, ...args);
};

const botConfig = {
  host: 'fakepixel.fun',
  username: 'DrakonTide',
  version: '1.12.2',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp island',
};

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
    keepAlive: true,
    checkTimeoutInterval: 60000
  });

  let alive = true;

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    try {
      bot._client.socket.setTimeout(24 * 60 * 60 * 1000);
      bot._client.socket.setKeepAlive(true, 10000);
    } catch (_) {}
    console.log('✅ Spawned');
    bot.manualQuit = false;
    setTimeout(() => {
      if (!alive) return;
      bot.chat(botConfig.loginCommand);
      setTimeout(() => {
        if (!alive) return;
        bot.chat(botConfig.warpCommand);
      }, 2000);
    }, 2000);
  });

  bot.on('end', () => {
    alive = false;
    if (!bot.manualQuit) {
      console.log('🔁 Disconnected. Reconnecting in 10s...');
      setTimeout(createBot, 10000);
    } else {
      console.log('🛑 Bot quit manually. No reconnect.');
    }
  });

  bot.on('error', err => console.log('❌ Error:', err.message));

  bot.quitBot = function () {
    bot.manualQuit = true;
    alive = false;
    bot.quit();
  };
}

createBot();
