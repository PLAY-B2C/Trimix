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
          moveToWithWaypoints(bot);
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

function moveToWithWaypoints(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxStepHeight = 2.5;
  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.scafoldingBlocks = [];

  bot.pathfinder.setMovements(movements);

  const waypoints = [
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-292, 95, -211),
    new Vec3(-331, 81, -228),
  ];

  let index = 0;
  function moveToNext() {
    if (index >= waypoints.length) {
      console.log('✅ Reached final location, start mob hunting');
      startMobKilling(bot);
      return;
    }

    const point = waypoints[index];
    console.log(`➡️ Moving to waypoint ${index + 1}: ${point}`);
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(point);
      if (dist < 2) {
        clearInterval(interval);
        index++;
        setTimeout(moveToNext, 1000);
      }
    }, 1000);
  }

  moveToNext();
}

function startMobKilling(bot) {
  const mcData = require('minecraft-data')(bot.version);

  let lastTeleport = 0;

  bot.setQuickBarSlot(0);
  console.log('🗡️ Switched to slot 1');

  setInterval(() => {
    const now = Date.now();
    const mobs = bot.nearestEntities((entity) => {
      return entity.type === 'mob' && entity.mobType !== 'Slime';
    });

    let target = null;
    for (const id in mobs) {
      const mob = mobs[id];
      const dist = bot.entity.position.distanceTo(mob.position);
      if (dist <= 15) {
        target = mob;
        break;
      }
    }

    if (target) {
      const dist = bot.entity.position.distanceTo(target.position);

      if (dist > 4.5) {
        bot.pathfinder.setGoal(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 1));
      } else {
        bot.attack(target);
        bot.lookAt(target.position.offset(0, target.height / 2, 0), true);
        console.log(`⚔️ Attacking ${target.name}`);
      }
    }

    // 🪄 Teleport with shovel every 4 seconds
    if (now - lastTeleport >= 4000) {
      lastTeleport = now;
      bot.setQuickBarSlot(1); // Slot 2
      bot.activateItem();     // Use shovel
      console.log('🌀 Teleporting forward');
      setTimeout(() => {
        bot.setQuickBarSlot(0); // Back to weapon
      }, 200);
    }
  }, 300);
}

createBot();
