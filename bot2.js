const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide', // change to ConnieSpringer or others as needed
  version: '1.16.5',
  password: '3043AA', // Used for /login
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', async () => {
    console.log(`✅ ${config.username} spawned.`);

    // Login after spawn
    if (config.password) {
      setTimeout(() => {
        bot.chat(`/login ${config.password}`);
        console.log(`🔐 Logged in with /login ${config.password}`);

        setTimeout(openTeleportChest, 2000); // Open chest after login
      }, 1000);
    }
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} error:`, err);
  });

  bot.on('end', () => {
    console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
    setTimeout(startBot, 10000);
  });
}

function openTeleportChest() {
  try {
    bot.setQuickBarSlot(0); // Select 1st hotbar slot
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Attempting to take item from slot 21`);

        const targetSlot = window.slots[21];
        if (targetSlot) {
          try {
            await bot.clickWindow(21, 0, 0);
            console.log(`🎯 Item clicked from slot 21`);
          } catch (err) {
            console.error('⚠️ Failed to click slot 21:', err.message);
          }
        } else {
          console.log('❌ Slot 21 is empty or undefined.');
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error opening chest:', err.message);
  }
}

startBot();
