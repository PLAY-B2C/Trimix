const mineflayer = require('mineflayer');

function createBot(username, password) {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: username,
    version: '1.16.5',
  });

  bot.on('login', () => {
    console.log(`[${username}] Logged in`);
  });

  bot.on('spawn', () => {
    console.log(`[${username}] Spawned`);
    // Send /login command after short delay
    setTimeout(() => {
      bot.chat(`/login ${password}`);
    }, 2000); // Wait 2 seconds for spawn
  });

  bot.on('end', () => {
    console.log(`[${username}] Disconnected from server`);
  });

  bot.on('error', (err) => {
    console.error(`[${username}] Error:`, err);
  });
}

// Create both bots
createBot('JamaaLcaliph', '3043AA');
createBot('BoltMC', '2151220');
