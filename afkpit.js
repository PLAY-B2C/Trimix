const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

function alwaysWalkForward() {
  // Keep reapplying forward movement just in case it's reset
  bot.setControlState('forward', true);
}

bot.once('spawn', () => {
  console.log('✅ Spawned');

  // Login
  bot.chat('/login ABCDEFG');
  console.log('🔐 Sent /login');

  // Join pit server
  setTimeout(() => {
    bot.chat('/server pit');
    console.log('🌍 Sent /server pit');
  }, 2000);
});

// Force movement after every respawn
bot.on('respawn', () => {
  console.log('💀 Respawned');
  alwaysWalkForward();
});

// Also reapply movement periodically to prevent it from stopping
setInterval(() => {
  if (bot && bot.player && bot.entity) {
    bot.setControlState('forward', true);
  }
}, 1000); // every second, ensure forward is active

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

bot.on('error', err => console.log('❌ Error:', err.message));
