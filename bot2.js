const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
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

    // Login
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Logged in with /login ${config.password}`);

      setTimeout(openTeleportChest, 2000);
    }, 1000);
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
    bot.setQuickBarSlot(0); // Select 1st hotbar slot (slot 0 = key 1)
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Moving item from hotbar slot 1 to slot 21`);

        const fromSlot = 36; // Hotbar slot 1 in inventory
        const toSlot = 21;

        const item = bot.inventory.slots[fromSlot];
        if (item) {
          try {
            await bot.clickWindow(fromSlot, 0, 0);
            await bot.clickWindow(toSlot, 0, 0);
            await bot.clickWindow(fromSlot, 0, 0); // Drop leftover if any
            console.log(`✅ Moved item from hotbar to slot 21`);
          } catch (err) {
            console.error(`⚠️ Failed to move item:`, err.message);
          }
        } else {
          console.log('❌ No item in hotbar slot 1 to move.');
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

startBot();
