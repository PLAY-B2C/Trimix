const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

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
    bot.activateItem();
    console.log('🖱️ Right-clicked item to open menu');

    bot.once('windowOpen', async (window) => {
      console.log('📦 Window opened');
      await bot.waitForTicks(30);

      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 21 is empty or not loaded');
      }

      setTimeout(() => {
        bot.chat('/warp spider');
        console.log('💬 Sent /warp spider');

        setTimeout(() => {
          startFlowerPatrol(bot);
        }, 8000);
      }, 2000);
    });
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

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startFlowerPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxStepHeight = 2.5;
  movements.canDig = false;
  movements.allowSprinting = true;
  movements.allowParkour = true;
  movements.allowFreeMotion = true;
  movements.scafoldingBlocks = [];
  movements.sprintSpeed = 0.36; // Simulate ~345 speed

  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-292, 95, -211),
    new Vec3(-315, 96, -191),
    new Vec3(-331, 81, -228),
    new Vec3(-347, 79, -236),
    new Vec3(-360, 72, -256),
    new Vec3(-357, 67, -270),
    new Vec3(-333, 60, -276),
    new Vec3(-322, 57, -280) // Final spot
  ];

  let index = 0;
  function moveToNext() {
    if (index >= waypoints.length) {
      console.log('🏁 Reached final patrol location');
      return;
    }

    const point = waypoints[index];
    console.log(`🚶 Moving to waypoint ${index + 1}: ${point}`);
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(point);
      if (dist < 2) {
        clearInterval(interval);
        index++;
        setTimeout(moveToNext, 1000);
      }
    }, 500);
  }

  moveToNext();

  // Constantly shoot flower every 300ms
  setInterval(() => {
    bot.setQuickBarSlot(0); // Slot 1 (flower shooter)
    bot.activateItem();     // Right-click
    console.log('🌸 Shot flower');
  }, 300);
}

createBot();
