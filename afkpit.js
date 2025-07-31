const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

bot.once('spawn', () => {
  console.log('✅ Spawned');

  setTimeout(() => {
    bot.chat('/login ABCDEFG');
    console.log('🔐 Logged in');

    setTimeout(() => {
      bot.chat('/server pit');
      console.log('🌍 Switching to /server pit');

      setTimeout(() => {
        bot.setControlState('forward', true);
        console.log('🚶 Always walking forward');
      }, 2000);
    }, 2000);
  }, 2000);
});

bot.on('error', err => console.log('❌ Error:', err.message));
bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});
