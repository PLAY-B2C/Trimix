const mineflayer = require('mineflayer');

function createBot(username, password) {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username,
    version: '1.16.5',
  });

  bot.on('login', () => {
    console.log(`[${username}] Logged in`);
  });

  bot.on('spawn', () => {
    console.log(`[${username}] Spawned, sending login...`);
    setTimeout(() => {
      bot.chat(`/login ${password}`);

      // Disconnect after 1 hour 10 minutes
      setTimeout(() => {
        console.log(`[${username}] Time's up — disconnecting.`);
        bot.quit('AFK time completed');
      }, 70 * 60 * 1000); // 70 minutes
    }, 3000);
  });

  bot.on('end', () => {
    console.log(`[${username}] Disconnected from server.`);
  });

  bot.on('error', (err) => {
    console.error(`[${username}] Error: ${err.message}`);
  });

  bot.on('message', (msg) => {
    console.log(`[${username}] Chat: ${msg.toString()}`);
  });
}

// 🔒 Start both bots
createBot('JamaaLcaliph', '3043AA');
createBot('BoltMC', '2151220');
