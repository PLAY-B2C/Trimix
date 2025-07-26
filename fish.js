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

    // Step 1: Wait and open GUI
    setTimeout(() => {
      bot.setQuickBarSlot(0); // Hold item in slot 1 (index 0)
      bot.activateItem();     // Right-click to open menu
    }, 4000);

    // Step 2: Shift-click 21st slot and warp
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

        setTimeout(async () => {
          bot.chat('/warp crimson');
          console.log('🌋 Warping to crimson...');
          await bot.waitForTicks(40);

          const mcData = require('minecraft-data')(bot.version);
          const movements = new Movements(bot, mcData);
          movements.allow1by1towers = true;
          movements.canDig = false;
          bot.pathfinder.setMovements(movements);

          // Step 3: Use bucket at first location
          const y1 = findGroundY(bot, -139, Math.floor(bot.entity.position.z));
          if (y1) await moveAndUse(bot, new Vec3(-139, y1, Math.floor(bot.entity.position.z)));

          // Step 4: Use bucket at second location
          const y2 = findGroundY(bot, -158, Math.floor(bot.entity.position.z));
          if (y2) await moveAndUse(bot, new Vec3(-158, y2, Math.floor(bot.entity.position.z)));

          // Step 5: Start fishing
          bot.setQuickBarSlot(2); // hotbar 3 = index 2
          console.log('🎣 Equipped fishing rod');
          await bot.waitForTicks(10);
          startFishing(bot);
        }, 1000);
      }
    });
  });

  bot.on('error', (err) => console.log('❌ Bot error:', err.message));
  bot.on('end', () => {
    console.log('🔁 Bot disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });
}

createBot();

// 🔍 Automatically finds walkable block Y
function findGroundY(bot, x, z, maxY = 80) {
  for (let y = maxY; y > 0; y--) {
    const block = bot.blockAt(new Vec3(x, y, z));
    if (block && block.boundingBox === 'block') {
      return y + 1; // stand on top
    }
  }
  console.log(`⚠️ Could not find walkable Y at ${x}, ${z}`);
  return null;
}

// 🔁 Shift + right-click at position using slot index 1
async function moveAndUse(bot, pos) {
  try {
    await bot.pathfinder.goto(new GoalBlock(pos.x, pos.y, pos.z));
    await bot.look(bot.entity.yaw, 0); // face north

    bot.setControlState('sneak', true);
    bot.setQuickBarSlot(1); // slot 2 (index 1)

    await bot.waitForTicks(5);
    bot.activateItem();
    console.log(`🪣 Used item at ${pos.x}, ${pos.y}`);

    await bot.waitForTicks(10);
    bot.setControlState('sneak', false);
  } catch (err) {
    console.log(`❌ Failed to move/use at ${pos.x}, ${pos.y}:`, err.message);
  }
}

// 🎣 Fishing logic
function startFishing(bot) {
  const fish = async () => {
    if (!bot.heldItem || !bot.heldItem.name.includes('fishing_rod')) {
      console.log('⚠️ Not holding a fishing rod.');
      return;
    }

    bot.activateItem(); // cast rod
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
