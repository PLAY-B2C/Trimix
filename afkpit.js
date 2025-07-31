const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

function forceWalkForward() {
  bot.setControlState('forward', true);
  console.log('🚶 Walking forward (reapplied)');
}

function joinPitServer() {
  bot.chat('/server pit');
  console.log('🌍 Sent /server pit');
}

bot.once('spawn', () => {
  console.log('✅ Spawned');

  setTimeout(() => {
    bot.chat('/login ABCDEFG');
    console.log('🔐 Sent /login');

    setTimeout(() => {
      joinPitServer();

      // Start walking forward after joining pit
      setTimeout(() => {
        forceWalkForward();
      }, 2000);
    }, 2000);
  }, 2000);
});

// If the bot dies and respawns
bot.on('respawn', () => {
  console.log('💀 Respawned');

  // Rejoin /server pit (in case server sent us back to hub)
  setTimeout(() => {
    joinPitServer();

    setTimeout(() => {
      forceWalkForward();
    }, 2000);
  }, 1000);
});

// Redundant: Force walking forward every second in case server resets state
setInterval(() => {
  if (bot && bot.entity && bot.player) {
    bot.setControlState('forward', true);
  }
}, 1000);

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

bot.on('error', err => console.log('❌ Error:', err.message));
