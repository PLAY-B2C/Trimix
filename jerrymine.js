const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide'
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);

    // Step 1: Right-click with hotbar slot 0
    bot.setQuickBarSlot(0);
    bot.activateItem();
    console.log('📦 Opened GUI');

    // Step 2: Wait for window open
    bot.once('windowOpen', async (window) => {
      try {
        await bot.clickWindow(20, 0, 1); // shift-click slot 21 (index 20)
        console.log('✅ Clicked GUI slot 21');
        bot.closeWindow(window);
      } catch (err) {
        console.log('❌ Failed to click slot:', err.message);
        return;
      }

      // Step 3: Wait and hold slot 8 (9th hotbar slot)
      setTimeout(() => {
        bot.setQuickBarSlot(8);
        console.log('🧊 Holding item in slot 9');
        goToIceMine(bot);
      }, 2000);
    });
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
}

function goToIceMine(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.jumpHeight = 2.5;
  movements.allowParkour = true;
  movements.allowFreeMotion = true;
  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(-300, 75, 250),
    new Vec3(-310, 75, 245),
    new Vec3(-315, 75, 240) // Ice mine
  ];

  let index = 0;
  function walkToNext() {
    if (index >= waypoints.length) {
      console.log('📍 Reached ice mine');
      startIceMining(bot);
      return;
    }
    const point = waypoints[index++];
    bot.pathfinder.setGoal(new GoalBlock(point.x, point.y, point.z));
    bot.once('goal_reached', () => {
      console.log(`✅ Reached: ${point}`);
      setTimeout(walkToNext, 300);
    });
  }

  walkToNext();
}

function startIceMining(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const range = 10;

  const pickaxeSlot = 2; // hotbar slot 2 (3rd slot)
  bot.setQuickBarSlot(pickaxeSlot);
  console.log('🪓 Equipped pickaxe from slot 3');

  function findIce() {
    const origin = bot.entity.position.floored();
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -range; dz <= range; dz++) {
          const pos = origin.offset(dx, dy, dz);
          const block = bot.blockAt(pos);
          if (!block || !block.name.includes('ice')) continue;
          if (pos.y > bot.entity.position.y + 1.5) continue;
          return pos;
        }
      }
    }
    return null;
  }

  function mineLoop() {
    const icePos = findIce();
    if (!icePos) {
      console.log('❌ No ice nearby. Scanning again...');
      return setTimeout(mineLoop, 3000);
    }

    console.log('🎯 Ice found at', icePos);
    bot.lookAt(icePos.offset(0.5, 0.5, 0.5), true);

    const goal = new GoalBlock(icePos.x, icePos.y, icePos.z);
    bot.pathfinder.setGoal(goal);

    const timeout = setTimeout(() => {
      console.log('⚠️ Stuck, trying again...');
      mineLoop();
    }, 5000);

    bot.once('goal_reached', async () => {
      clearTimeout(timeout);
      const block = bot.blockAt(icePos);
      if (block && block.name.includes('ice')) {
        bot.setQuickBarSlot(pickaxeSlot);
        await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));
        bot.swingArm('right', true);
        console.log('⛏️ Mining ice...');
        setTimeout(mineLoop, 1500);
      } else {
        mineLoop();
      }
    });
  }

  mineLoop();
}

createBot();
