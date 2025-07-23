const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const Vec3 = require('vec3');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);
    bot.setQuickBarSlot(0); // Slot 1
    bot.activateItem(); // Right-click to open GUI if needed

    await bot.waitForTicks(40);
    bot.chat('/warp spider');
    console.log('💬 Warped to spider');

    await bot.waitForTicks(100); // Wait to finish teleport

    startMovingAndSpamming(bot);
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Bot error:', err.message);
  });
}

function startMovingAndSpamming(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.maxDropDown = 4;

  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(-233, 80, -244),
    new Vec3(-248, 83, -240),
    new Vec3(-261, 86, -237),
    new Vec3(-276, 90, -225),
    new Vec3(-292, 95, -211),
    new Vec3(-310, 88, -218),
    new Vec3(-321, 84, -222),
    new Vec3(-331, 81, -228)
  ];

  async function walkWaypoints() {
    for (const point of waypoints) {
      console.log('🚶 Moving to:', point);
      try {
        await bot.pathfinder.goto(new GoalBlock(point.x, point.y, point.z));
        await bot.waitForTicks(10);
      } catch (e) {
        console.log('⚠️ Pathfinding failed:', e.message);
      }
    }

    // Look toward target and spam right-click
    const lookTarget = new Vec3(-144.5, bot.entity.position.y, 5);
    await bot.lookAt(lookTarget);

    console.log('🎯 Looking and starting right-click spam');
    setInterval(() => {
      bot.setQuickBarSlot(0); // Slot 1
      bot.activateItem();     // Right-click
    }, 200);
  }

  walkWaypoints();
}

// 🚀 Start bot
createBot();
