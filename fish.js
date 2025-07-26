const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'DrakonTide',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');

    // Step 2: Right click while holding hotbar slot 0
    await bot.waitForTicks(5);
    bot.setQuickBarSlot(0); // hotbar index 0 = 1st slot
    await bot.waitForTicks(5);
    bot.activateItem(); // right-click
    console.log('🖱️ Right-clicked with item in slot 1');

    // Step 3: Shift-click item to slot 21 (index 20)
    await bot.waitForTicks(10);
    const window = bot.currentWindow;
    const slot20 = window?.slots[36]; // slot 36 = hotbar index 0 in inventory
    if (slot20) {
      await bot.clickWindow(36, 0, true); // shift-click from hotbar to slot 21
      console.log('📦 Shift-clicked item to slot 21');
    } else {
      console.log('⚠️ No item in slot 1 to shift-click');
    }

    // Step 4: Wait 1 second
    setTimeout(async () => {
      bot.chat('/warp crimson');
      console.log('🌋 Warping to crimson...');
      await bot.waitForTicks(40);

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
