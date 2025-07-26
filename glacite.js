const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

let reconnecting = false;
let patrolIndex = 0;
let reachedGlacite = false;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp dwarven';
const glaciteCenter = new Vec3(0, 128, 160);
const initialWaypoints = [
  new Vec3(66, 200, -104),
  new Vec3(140, 187, 14),
  glaciteCenter
];
const targetMobNames = ['Glacite', 'Glacite Protector'];

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

    // Delay to allow login
    setTimeout(() => {
      bot.chat(loginCommand);

      setTimeout(() => {
        bot.setQuickBarSlot(0);
        bot.activateItem(); // open GUI from hotbar slot
      }, 2000);
    }, 2000);

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slot = window.slots[20]; // 21st slot = index 20

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1); // Shift-click teleport item
          console.log('🎯 Shift-clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => startPatrol(bot), 8000);
      }, 2000);
    });

    startCombatLoop(bot);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    reachedGlacite = false;
    console.log('☠️ Bot died. Restarting...');
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
    if (!bot?.entity || bot.entity.health <= 0 || !reachedGlacite) return;
    try {
      bot.setQuickBarSlot(0);
      bot.activateItem();
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

    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(interval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        if (patrolIndex === initialWaypoints.length - 1) {
          reachedGlacite = true;
          startRightClickLoop(bot);
          startRandomWander(bot);
        } else {
          patrolIndex++;
          setTimeout(goToNextWaypoint, 300);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(goToNextWaypoint, 300);
      }
    }, 500);
  }

  goToNextWaypoint();
}

function startRandomWander(bot) {
  console.log('🌟 Reached Glacite. Wandering and engaging mobs...');
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  function wanderOnce() {
    const offsetX = Math.floor(Math.random() * 25) - 12;
    const offsetZ = Math.floor(Math.random() * 25) - 12;
    const dest = glaciteCenter.offset(offsetX, 0, offsetZ);
    const groundY = bot.blockAt(dest)?.position.y || glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(dest.x, groundY, dest.z, 1));

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

function startCombatLoop(bot) {
  setInterval(() => {
    if (!reachedGlacite || !bot.entity || bot.entity.health <= 0) return;

    const mob = bot.nearestEntity(e =>
      e.type === 'mob' &&
      e.name &&
      targetMobNames.some(name => e.name.toLowerCase().includes(name.toLowerCase()))
    );

    if (mob) {
      bot.lookAt(mob.position.offset(0, mob.height, 0), true, () => {
        if (bot.canSeeEntity(mob)) {
          bot.attack(mob);
        }
      });
    }
  }, 250);
}

createBot();
