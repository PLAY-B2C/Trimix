const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Bot spawned.');
    bot.chat('/login 3043AA');

    // Wait for login
    await delay(3000);

    // Step 1: Right click with slot 0 to open GUI
    bot.setQuickBarSlot(0);
    bot.activateItem();

    // Wait for GUI to open
    bot.once('windowOpen', async (window) => {
      console.log('📦 GUI opened');

      try {
        // Step 2: Shift-click slot 20 (index)
        await bot.clickWindow(20, 0, 1);
        console.log('✅ Shift-clicked slot 21');
      } catch (err) {
        console.log('❌ Failed to click GUI slot:', err.message);
      }

      await delay(2000);

      // Step 3: Equip slot 8 (9th hotbar)
      try {
        bot.setQuickBarSlot(8);
        console.log('🧤 Held item in slot 9');
      } catch (err) {
        console.log('❌ Failed to select hotbar slot 8:', err.message);
      }

      // Step 4: Proceed to ice mine
      goToIceMine(bot);
    });
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });
}

function goToIceMine(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.jumpHeight = 2.5;
  movements.allowFreeMotion = true;
  movements.allowParkour = true;
  movements.canJump = true;

  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(1, 76, 58),
    new Vec3(40, 76, 55),
  ];

  let index = 0;

  function walkNext() {
    if (index >= waypoints.length) {
      console.log('✅ Reached final destination (ice mine).');
      return;
    }

    const target = waypoints[index++];
    console.log(`🚶 Going to waypoint: ${target}`);
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    bot.once('goal_reached', () => {
      console.log(`📍 Reached: ${target}`);
      setTimeout(walkNext, 300);
    });
  }

  walkNext();
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

createBot();
