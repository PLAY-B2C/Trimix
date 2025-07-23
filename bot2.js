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
    bot.setQuickBarSlot(0); // First hotbar slot (item that opens chest)
    setTimeout(() => {
      bot.activateItem(); // Right-click to open chest
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', (window) => {
        console.log(`📦 Chest opened. Looking for item in inventory to move`);

        setTimeout(async () => {
          const invSlots = bot.inventory.slots;
          const firstItemSlot = invSlots.findIndex(item => item); // Find first non-empty slot
          const targetSlot = 20; // Slot 21 in chest (0-indexed)

          if (firstItemSlot === -1) {
            console.log('❌ No items found in inventory to move.');
            return;
          }

          try {
            await bot.clickWindow(firstItemSlot, 0, 0); // Pick up item
            await bot.clickWindow(targetSlot, 0, 0);     // Place into chest
            console.log(`✅ Moved item from slot ${firstItemSlot} to chest slot 21`);
          } catch (err) {
            console.error('⚠️ Failed to move item:', err.message);
          }
        }, 300);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error opening chest:', err.message);
  }
}

startBot();
