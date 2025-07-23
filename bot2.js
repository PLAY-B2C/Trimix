const mineflayer = require('mineflayer');

let reconnectTimeout = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'your.server.ip',
    port: 25565,
    username: 'YourUsername',
    version: '1.16.5',
  });

  bot.once('spawn', async () => {
    console.log('✅ Bot spawned');

    try {
      bot.chat('/login 3043AA');
      await sleep(2000);

      // Open menu and shift-click slot 21
      const heldItem = bot.inventory.slots[36];
      if (heldItem) bot.activateItem();

      bot.once('windowOpen', (window) => {
        setTimeout(() => {
          bot.clickWindow(20, 0, 1); // shift-click slot 21
        }, 500);
      });

      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
      }, 3000);

      setTimeout(() => {
        console.log('🎯 Locking view & starting dig/strafe loop');
        holdLeftClickForever(bot);
        startStrafingLoop(bot);
      }, 11000);
    } catch (err) {
      console.error('❌ Startup error:', err);
    }
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });

  bot.on('end', () => {
    console.log('🔁 Bot disconnected');
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        console.log('🔌 Reconnecting...');
        createBot();
      }, 10000); // 10s cooldown
    }
  });
}

function holdLeftClickForever(bot) {
  bot.setControlState('swing', true); // Use 'swing' for 1.16.5
}

function startStrafingLoop(bot) {
  let strafeLeft = true;

  function strafe() {
    bot.clearControlStates(); // Ensure no extra movement
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
    console.log(`🚶 Strafing ${strafeLeft ? 'left' : 'right'}`);
    strafeLeft = !strafeLeft;

    setTimeout(strafe, 40000); // 40 seconds
  }

  strafe();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createBot();
