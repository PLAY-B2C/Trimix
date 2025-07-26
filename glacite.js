const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  originalWarn(msg, ...args);
};

const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
  roamRadius: 8,
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55),
    new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -22),
    new Vec3(-53, 147, -12),
    new Vec3(-51, 137, 17),
    new Vec3(-28, 131, 31),
    new Vec3(-7, 128, 59),
    new Vec3(0, 128, 160)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let roamTimer = null;
let clickLoopActive = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    patrolIndex = 0;
    reachedGlacite = false;

    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 1000); // Wait 1s after login
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    clearTimeout(roamTimer);
    clickLoopActive = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    clearTimeout(roamTimer);
    clickLoopActive = false;
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });

  bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString().toLowerCase();
    console.log('📩 Chat:', msg);

    if (reachedGlacite && msg.includes('drakontide')) {
      console.log('📢 Name mentioned! Disconnecting in 5s...');
      setTimeout(() => bot.quit(), 5000);
    }
  });

  function openTeleportGUI(bot) {
    bot.setQuickBarSlot(0);
    bot.activateItem(); // Right-click with slot 0

    bot.once('windowOpen', async (window) => {
      try {
        await bot.waitForTicks(10);
        const slot = window.slots[20];
        if (slot && slot.name !== 'air') {
          await bot.clickWindow(20, 0, 1); // Shift-click slot 20
          console.log('🎯 Shift-clicked slot 20.');

          setTimeout(() => {
            bot.chat(botConfig.warpCommand); // /warp dwarven
            console.log('🚀 Warping to dwarven...');
            setTimeout(() => startPatrol(bot), 8000);
          }, 1000); // Wait 1s after shift-click
        } else {
          console.log('⚠️ Slot 20 empty or not found.');
        }
      } catch (err) {
        console.log('❌ GUI click error:', err.message);
      }
    });
  }

  function startPatrol(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

    let retryCount = 0;
    const maxRetries = 3;

    function moveToNext() {
      if (patrolIndex >= botConfig.waypoints.length)
        patrolIndex = botConfig.waypoints.length - 1;

      const target = botConfig.waypoints[patrolIndex];
      bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

      const interval = setInterval(() => {
        const distXZ = Math.hypot(
          bot.entity.position.x - target.x,
          bot.entity.position.z - target.z
        );
        if (distXZ < 2) {
          clearInterval(interval);
          retryCount = 0;
          console.log(`📍 Reached waypoint ${patrolIndex}`);
          if (patrolIndex === botConfig.waypoints.length - 1) {
            reachedGlacite = true;
            console.log('🌟 Reached Glacite. Starting roam mode...');
            startRoam(bot);
          } else {
            patrolIndex++;
            setTimeout(moveToNext, 600);
          }
        } else if (!bot.pathfinder.isMoving()) {
          clearInterval(interval);
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔁 Retry ${retryCount}/${maxRetries} for waypoint ${patrolIndex}`);
            setTimeout(moveToNext, 800);
          } else {
            console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Skipping to next nearest.`);
            patrolIndex = getNextNearestWaypointIndex(patrolIndex + 1);
            retryCount = 0;
            setTimeout(moveToNext, 800);
          }
        }
      }, 500);
    }

    function getNextNearestWaypointIndex(minIndex = 0) {
      const pos = bot.entity.position;
      let nearestIndex = minIndex;
      let minDist = Infinity;
      for (let i = minIndex; i < botConfig.waypoints.length; i++) {
        const wp = botConfig.waypoints[i];
        const dist = pos.distanceTo(wp);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      }
      return nearestIndex;
    }

    moveToNext();
  }

  function startRoam(bot) {
    if (!clickLoopActive) {
      clickLoopActive = true;
      clickLoop(bot);
    }
    roam(bot);
  }

  function clickLoop(bot) {
    if (!reachedGlacite || !bot.entity) return;
    bot.setQuickBarSlot(0);
    bot.activateItem();
    setTimeout(() => clickLoop(bot), 200);
  }

  function roam(bot) {
    if (!reachedGlacite) return;

    const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const block = bot.blockAt(target);
    const y = block ? block.position.y : botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
    roamTimer = setTimeout(() => roam(bot), 5000 + Math.random() * 3000);
  }
}

createBot();
