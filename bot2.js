const mineflayer = require('mineflayer');

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
    bot.setQuickBarSlot(0); // Select item in 1st hotbar slot
    setTimeout(() => {
      bot.activateItem(); // Right-click to open chest
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Looking for item in inventory...`);

        // Find any item in inventory
        const playerInventorySlots = bot.inventory.slots.slice(9, 45);
        const itemToMove = playerInventorySlots.find(i => i);

        if (!itemToMove) {
          console.log('❌ No item found in inventory to move.');
          return;
        }

        const sourceSlot = itemToMove.slot;
        const destSlot = 20; // 0-based index for chest GUI slot 21

        try {
          await bot.transfer({
            window: window,
            itemType: itemToMove.type,
            metadata: itemToMove.metadata,
            count: 1,
            sourceStart: 9,
            sourceEnd: 44,
            destStart: 0,
            destEnd: window.slots.length - 1,
          });
          console.log(`✅ Transferred item from inv slot ${sourceSlot} to chest slot 21`);
        } catch (err) {
          console.error('⚠️ Failed to transfer item:', err.message);
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error opening chest:', err.message);
  }
}

startBot();
