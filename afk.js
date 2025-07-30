const mineflayer = require('mineflayer');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'BoltMC',
    version: '1.8.9',
  });

  let loginConfirmed = false;

  bot.on('spawn', () => {
    // Disable built-in keepalive timeout
    if (bot._client && bot._client.keepalive) {
      clearTimeout(bot._client.keepalive.timeout);
      bot._client.keepalive.timeout = null;
    }

    // Login command
    setTimeout(() => {
      bot.chat('/login 2151220');
    }, 2000);

    // Confirm login after a short delay
    setTimeout(() => {
      if (bot.player && bot.player.uuid) {
        loginConfirmed = true;
        console.log('[BoltMC] ✅ Login successful');
      }
    }, 7000);
  });

  bot.on('end', () => {
    if (!loginConfirmed) {
      console.log('[BoltMC] ❌ Login failed or disconnected early');
    } else {
      console.log('[BoltMC] 🔴 Disconnected');
    }
  });

  bot.on('error', (err) => {
    console.log(`[BoltMC] ❌ Error: ${err.message}`);
  });
}

// ▶️ Run the bot
createBot();
