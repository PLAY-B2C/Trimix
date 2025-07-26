const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let reachedGlacite = false;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp dwarven';

const glaciteCenter = new Vec3(0, 128, 160);
const initialWaypoints = [
  new Vec3(66, 200, -104),
  glaciteCenter
];

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    setTimeout(() => bot.chat(loginCommand), 2000);

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 4000);

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
          console.log('🎯 Shift-clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }

      // Step 4: Warp
      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => startPatrol(bot), 8000);
      }, 2000);
    });

    startRightClickLoop(bot);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    reachedGlacite = false;
    console.log('☠️ Bot died. Restarting full route...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
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
      bot.activateItem(); // Right-click
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

  function goToNextWaypoint() {
    if (patrolIndex >= initialWaypoints.length) {
      patrolIndex = initialWaypoints.length - 1;
    }

    const target = initialWaypoints[patrolIndex];
    if (!target) return;

    const safeY = bot.blockAt(target)?.position.y || target.y;
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, safeY, target.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);

      if (dist < 2) {
        clearInterval(interval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        if (patrolIndex === initialWaypoints.length - 1) {
          reachedGlacite = true;
          startRandomWander(bot);
        } else {
          patrolIndex++;
          setTimeout(goToNextWaypoint, 200);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(goToNextWaypoint, 200);
      }
    }, 500);
  }

  goToNextWaypoint();
}

function startRandomWander(bot) {
  console.log('🌟 Reached Glacite. Starting random patrol...');

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  function wanderOnce() {
    const offsetX = Math.floor(Math.random() * 25) - 12;
    const offsetZ = Math.floor(Math.random() * 25) - 12;
    const dest = glaciteCenter.offset(offsetX, 0, offsetZ);

    const groundBlock = bot.blockAt(dest);
    const safeY = groundBlock ? groundBlock.position.y : glaciteCenter.y;

    bot.pathfinder.setGoal(new goals.GoalNear(dest.x, safeY, dest.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(dest);
      if (dist < 2 || !bot.pathfinder.isMoving()) {
        clearInterval(interval);
        setTimeout(wanderOnce, 2000 + Math.random() * 3000);
      }
    }, 500);
  }

  wanderOnce();
}

createBot();
