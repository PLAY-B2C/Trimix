const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

function startWalking() {
  bot.setControlState('forward', true);
  console.log('🚶 Resumed walking forward');
}

bot.once('spawn', () => {
  console.log('✅ Spawned');

  setTimeout(() => {
    bot.chat('/login ABCDEFG');
    console.log('🔐 Logged in');

    setTimeout(() => {
      bot.chat('/server pit');
      console.log('🌍 Switching to /server pit');

      setTimeout(startWalking, 2000); // start walking after changing server
    }, 2000);
  }, 2000);
});

// Reapply walking when the bot respawns after death
bot.on('respawn', () => {
  console.log('💀 Respawned');
  setTimeout(startWalking, 1000); // short delay to make sure it's safe
});

bot.on('error', err => console.log('❌ Error:', err.message));
bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});
