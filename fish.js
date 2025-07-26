const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'B2C',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');

    // Wait 4 seconds, then right-click with hotbar slot 0
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 4000);
  });

  bot.once('windowOpen', async (window) => {
    await bot.waitForTicks(30);

    const slotIndex = 20;
    const slot = window.slots[slotIndex];

    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(slotIndex, 0, 1); // shift-click
        console.log('🎯 Shift-clicked teleport item.');
      } catch (err) {
        console.log('❌ GUI click error:', err.message);
      }

      // Step 4: Wait 1 second
      setTimeout(async () => {
        bot.chat('/warp crimson');
        console.log('🌋 Warping to crimson...');
        await bot.waitForTicks(40); // ~2s

        const mcData = require('minecraft-data')(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);

        // Step 5: Go to first lava block
        await moveAndUse(bot, new Vec3(-139, 12, Math.floor(bot.entity.position.z)));

        // Step 6: Go to second lava block
        await moveAndUse(bot, new Vec3(-158, 36, Math.floor(bot.entity.position.z)));

        // Step 7: Equip fishing rod and start fishing
        bot.setQuickBarSlot(2); // hotbar index 2 = 3rd slot
        console.log('🎣 Equipped fishing rod');
        await bot.waitForTicks(10);
        startFishing(bot);
      }, 1000);
    }
  });

  bot.on('error', (err) => console.log('❌ Bot error:', err.message));
  bot.on('end', () => {
    console.log('🔁 Bot disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });
}

createBot();

// 🔁 Shift + Right-click at a position using item in hotbar 1 or fallback to 0
async function moveAndUse(bot, pos) {
  await bot.pathfinder.goto(new GoalBlock(pos.x, pos.y, pos.z));
  await bot.look(bot.entity.yaw, 0); // Face north
  bot.setControlState('sneak', true);
  bot.setQuickBarSlot(bot.inventory.slots[37] ? 1 : 0); // prefer slot 2, fallback to slot 1
  await bot.waitForTicks(5);
  bot.activateItem();
  console.log(`🪣 Used item at ${pos.x}, ${pos.y}`);
  await bot.waitForTicks(10);
  bot.setControlState('sneak', false);
}

// 🎣 Fishing logic
function startFishing(bot) {
  const fish = async () => {
    if (!bot.heldItem || !bot.heldItem.name.includes('fishing_rod')) {
      console.log('⚠️ Not holding a fishing rod.');
      return;
    }

    bot.activateItem();
    console.log('🎣 Cast rod');

    bot.once('playerCollect', async (collector) => {
      if (collector.username === bot.username) {
        console.log('✅ Caught fish!');
        await bot.waitForTicks(10);
        fish();
      }
    });

    setTimeout(() => {
      console.log('⌛ No bite – re-casting');
      fish();
    }, 15000);
  };

  fish();
}
