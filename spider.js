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
    new Vec3(-315, 96, -191),
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

  console.log('🗡️ Starting mob hunt');

  setInterval(() => {
    const now = Date.now();

    const mobs = Object.values(bot.entities).filter(entity =>
      entity.type === 'mob' && entity.mobType !== 'Slime'
    );

    if (mobs.length === 0) return;

    const target = mobs.reduce((a, b) =>
      bot.entity.position.distanceTo(a.position) < bot.entity.position.distanceTo(b.position) ? a : b
    );

    const dist = bot.entity.position.distanceTo(target.position);

    // 🌸 Ranged flower shot
    if (dist <= 30) {
      bot.lookAt(target.position.offset(0, target.height / 2, 0), true);
      bot.setQuickBarSlot(0); // flower shooter
      bot.activateItem(); // shoot flower
      console.log(`🌸 Shot flower at ${target.name} (${Math.round(dist)} blocks)`);
      return; // skip melee if handled
    }

    // ⚔️ Melee fallback
    if (dist <= 4.5) {
      bot.setQuickBarSlot(0);
      bot.attack(target);
      console.log(`⚔️ Melee attacking ${target.name}`);
    } else {
      bot.pathfinder.setGoal(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 1));
      console.log(`🚶 Approaching ${target.name}`);
    }

    // 🌀 Teleport shovel
    if (now - lastTeleport >= 4000) {
      lastTeleport = now;
      bot.setQuickBarSlot(1);
      bot.activateItem();
      console.log('🌀 Teleporting forward');
      setTimeout(() => {
        bot.setQuickBarSlot(0);
      }, 200);
    }
  }, 300);
}

createBot();
