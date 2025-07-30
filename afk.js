const mineflayer = require('mineflayer');

function createBot(username, password) {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username,
    version: '1.16.5',
  });

  let loginConfirmed = false;

  bot.on('spawn', () => {
    setTimeout(() => {
      bot.chat(`/login ${password}`);
    }, 2000);

    setTimeout(() => {
      if (bot.player && bot.player.uuid) {
        loginConfirmed = true;
        console.log(`[${username}] ✅ Login successful`);
      }
    }, 7000);
  });

  bot.on('end', () => {
    if (!loginConfirmed) {
      console.log(`[${username}] ❌ Login failed or disconnected early`);
    }
  });

  bot.on('error', () => {
    console.log(`[${username}] ❌ Login error`);
  });
}

// 🟢 BoltMC bot only
createBot('BoltMC', '2151220');
