const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { setTimeout } = require('timers');

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
          goToAndSpam(bot);
        }, 8000); // wait after warp
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

function goToAndSpam(bot) {
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

  const finalLook = new Vec3(-144.5, bot.entity.position.y, 5);

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxStepHeight = 2.5;
  movements.canDig = false;

  bot.pathfinder.setMovements(movements);

  let current = 0;

  function moveToNext() {
    if (current >= waypoints.length) return onArrived();

    const target = waypoints[current];
    console.log(`➡️ Moving to waypoint ${current + 1}: ${target.x}, ${target.y}, ${target.z}`);
    const goal = new goals.GoalNear(target.x, target.y, target.z, 1);
    bot.pathfinder.setGoal(goal);

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist <= 1.2) {
        clearInterval(interval);
        current++;
        moveToNext();
      }
    }, 700);
  }

  function onArrived() {
    console.log('✅ Reached final destination');
    bot.lookAt(finalLook, true, () => {
      console.log(`🎯 Looking at ${finalLook.x}, ${finalLook.y}, ${finalLook.z}`);

      // Lock camera
      const yaw = bot.entity.yaw;
      const pitch = bot.entity.pitch;
      bot.on('move', () => {
        bot.entity.yaw = yaw;
        bot.entity.pitch = pitch;
      });
      bot.look = async () => {};
      bot.lookAt = async () => {};

      bot.setQuickBarSlot(0);
      console.log('🎒 Holding item in slot 1');

      setInterval(() => {
        bot.activateItem();
      }, 300);
    });
  }

  moveToNext();
}

// 🚀 Start bot
createBot();
