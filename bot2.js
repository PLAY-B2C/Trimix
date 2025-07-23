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
        console.log(`📦 Chest opened. Preparing to move item from inventory slot 34`);

        setTimeout(async () => {
          const sourceSlot = 34;  // Inventory row 3, 8th slot
          const targetSlot = 20;  // Chest slot 21 (index 20)

          const sourceItem = bot.inventory.slots[sourceSlot];
          if (!sourceItem) {
            console.log('❌ No item in inventory slot 34 to move.');
            return;
          }

          try {
            await bot.clickWindow(sourceSlot, 0, 0); // Pick up
            await bot.clickWindow(targetSlot, 0, 0); // Drop into chest
            console.log(`✅ Moved item from slot 34 to chest slot 21`);
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
