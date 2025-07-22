const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA',
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', () => {
    console.log(`✅ ${config.username} spawned.`);

    if (config.password) {
      setTimeout(() => {
        bot.chat(`/login ${config.password}`);
        console.log(`🔐 Logged in with /login ${config.password}`);

        setTimeout(openTeleportChest, 2000);
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

      bot.once('windowOpen', (window) => {
        console.log(`📦 Chest opened. Waiting for slots to load...`);

        setTimeout(async () => {
          const targetSlot = window.slots[20]; // slot 21 is index 20
          if (targetSlot) {
            try {
              await bot.clickWindow(20, 0, 0);
              console.log(`🎯 Item clicked from slot 21`);
            } catch (err) {
              console.error('⚠️ Failed to click slot 21:', err.message);
            }
          } else {
            console.log('❌ Slot 21 is still empty or undefined after delay.');
          }
        }, 300); // Wait 300ms for slot contents to load
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error opening chest:', err.message);
  }
}

startBot();
