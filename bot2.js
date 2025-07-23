const mineflayer = require('mineflayer');
const { setTimeout } = require('timers');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.once('spawn', async () => {
    console.log('✅ Logged in, locking view');

    bot.chat('/login 3043AA');

    // Right-click the held item to open the GUI
    await bot.waitForTicks(20); // Wait 1s
    bot.activateItem();
    console.log('🖱️ Right-clicked item to open menu');

    // Wait for the chest window to be opened
    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30); // 1.5s delay for items to load

      const slot = window.slots[20]; // Slot 21 is index 20

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1); // Shift-click
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 21 empty or not loaded');
      }

      // Warp twice
      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');
      }, 2000);

      // Begin digging after warp
      setTimeout(() => {
        console.log('🎯 Locking view & starting dig/strafe loop');
        holdLeftClickForever(bot);
        startStrafing(bot);
      }, 10000); // Wait 8s after warp
    });
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function holdLeftClickForever(bot) {
  try {
    bot.setControlState('swing', true); // Hold down left click
  } catch (e) {
    console.log('⛏️ Dig error:', e.message);
  }
}

function startStrafing(bot) {
  let strafeLeft = true;
  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000); // Every 45s
}

createBot();
