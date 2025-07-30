const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;

function createBot() {
  bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'B2C',
    version: '1.16.5',
  });

  bot.on('login', () => {
    console.log('✅ Logged in');
  });

  bot.once('spawn', () => {
    bot.chat('/login 3043AA');

    setTimeout(() => {
      bot.setQuickBarSlot(0); // Set to slot 0
      bot.activateItem();     // Right-click with item
      console.log('🖱️ Right-clicked with item in slot 0');

      setTimeout(() => {
        const window = bot.currentWindow;
        if (!window) {
          console.log('⚠️ No GUI window opened.');
          return;
        }

        const slot = window.slots[20];
        if (!slot) {
          console.log('⚠️ Slot 20 is empty or undefined.');
          return;
        }

        bot.shiftClickWindow(20);
        console.log('✅ Shift-clicked slot 20');

        setTimeout(() => {
          bot.chat('/warp museum');
          console.log('🧭 Warped to museum');
        }, 2000);
      }, 400); // Wait for chest GUI to open
    }, 1000); // Wait after login
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected from server.');
    scheduleReconnect();
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
    scheduleReconnect();
  });
}

// Prevent reconnect spam
function scheduleReconnect() {
  if (reconnectTimeout) return;

  console.log('🔁 Reconnecting in 10 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 10000);
}

createBot();
