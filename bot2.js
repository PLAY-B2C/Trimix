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
    bot.setQuickBarSlot(0); // 1st hotbar slot
    setTimeout(() => {
      bot.activateItem(); // Right-click to open chest
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Looking for first inventory item to move...`);

        const playerInvSlots = bot.inventory.slots.slice(9, 45); // Only player inv slots

        // Find first slot with an item
        const itemSlot = playerInvSlots.find(slot => slot);
        if (!itemSlot) {
          console.log('❌ No item found in inventory to move.');
          return;
        }

        const sourceSlot = itemSlot.slot;
        const targetSlot = 20; // Chest GUI slot 21 (0-indexed)

        try {
          await bot.clickWindow(sourceSlot, 0, 0); // Pick up the item
          await bot.waitForTicks(10);             // Small delay
          await bot.clickWindow(targetSlot, 0, 0); // Place into chest
          console.log(`✅ Moved item from inventory slot ${sourceSlot} to chest slot 21`);
        } catch (err) {
          console.error(`⚠️ Failed to move item from ${sourceSlot} → 21:`, err.message);
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error opening chest:', err.message);
  }
}

startBot();
