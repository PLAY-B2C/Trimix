const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

const allWaypoints = [
  new Vec3(-233, 80, -244),
  new Vec3(-261, 86, -237),
  new Vec3(-281, 95, -233),
  new Vec3(-292, 95, -211),
  new Vec3(-315, 96, -191),
  new Vec3(-331, 81, -228),
  new Vec3(-302, 67, -273),
  new Vec3(-299, 67, -284), // index 11 — becomes patrol home
  new Vec3(-282, 65, -295),
  new Vec3(-258, 61, -273),
  new Vec3(-282, 65, -295),
];

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'JamaaLcaliph',
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');

    setTimeout(() => bot.chat(loginCommand), 2000);

    // Wait for login before activating item
    setTimeout(async () => {
      try {
        bot.setQuickBarSlot(0);
        bot.look(0, 0); // Face forward
        await bot.waitForTicks(5);
        bot.activateItem(); // Open GUI from held item
        console.log('📦 Attempted to open chest GUI via right-click item');
      } catch (err) {
        console.log('❌ Failed to activate item:', err.message);
      }
    }, 4000);

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);

      const chestSlots = window.slots.slice(0, window.inventoryStart); // chest slots only
      chestSlots.forEach((slot, index) => {
        if (slot && slot.name !== 'air') {
          console.log(`🔹 Chest Slot ${index}: ${slot.name}`);
        }
      });

      const slotIndex = 20; // 21st visible chest slot
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1); // shift-click
          console.log(`🎯 Shift-clicked slot ${slotIndex} (${slot.name})`);
        } catch (err) {
          console.log('❌ Shift-click error:', err.message);
        }
      } else {
        console.log(`⚠️ Slot ${slotIndex} is empty or not loaded.`);
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => {
          startPatrol(bot);
        }, 8000);
      }, 2000);
    });

    startRightClickLoop(bot);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    patrolMode = 'initial';
    console.log('☠️ Bot died. Restarting full route...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol(bot);
      }, 8000);
    }, 2000);
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

function startRightClickLoop(bot) {
  setInterval(() => {
    if (!bot?.entity || bot.entity.health <= 0) return;
    try {
      bot.setQuickBarSlot(0);
      bot.activateItem(); // ✅ Correct right-click behavior
    } catch (err) {
      console.log('⚠️ Right click failed:', err.message);
    }
  }, 300);
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  const waypoints =
    patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(11);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = 0;
      patrolMode = 'loop';
      console.log('🔁 Restarting patrol from HOME');
    }

    const target = waypoints[patrolIndex];
    if (!target) return;

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const checkInterval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);

      if (dist < 2) {
        clearInterval(checkInterval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

createBot();
