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
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);

    // Right-click with first hotbar item to open GUI
    await bot.equip(bot.inventory.slots[36], 'hand'); // slot 0 = index 36
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      console.log('📦 Opened GUI');

      try {
        await bot.clickWindow(20, 0, 1); // Shift-click slot 21
        console.log('✅ Clicked GUI slot 21');

        await bot.waitForTicks(10);

        await bot.clickWindow(38, 0, 1); // Shift-click slot 39
        console.log('✅ Clicked GUI slot 39');

        await bot.waitForTicks(40); // 2 seconds

        const item = bot.inventory.slots[44]; // slot 9 = index 44
        if (item) {
          await bot.equip(item, 'hand');
          console.log('🧊 Holding item in slot 9');
        } else {
          console.log('⚠️ No item in slot 9');
        }

        goToIceMine(bot);

      } catch (err) {
        console.log('❌ GUI error:', err.message);
      }
    });
  });

  bot.on('error', err => console.log('❌ Error:', err.message));
  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });
}

createBot();

function goToIceMine(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.canDig = false;
  movements.allowParkour = true;
  movements.allow1by1towers = false;

  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(1, 76, 58),
    new Vec3(40, 76, 55),
  ];

  let index = 0;

  function walkNext() {
    if (index >= waypoints.length) {
      console.log('🏁 Arrived at ice mine.');
      return;
    }

    const target = waypoints[index++];
    console.log(`➡️ Walking to`, target);
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    bot.once('goal_reached', () => {
      console.log('✅ Reached', target);
      setTimeout(walkNext, 300);
    });
  }

  walkNext();
}
