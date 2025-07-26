const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

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

    // 🔁 Keep the connection alive indefinitely
    setInterval(() => {
      try {
        if (bot._client?.state === 'play') {
          bot._client.write('keep_alive', {
            keepAliveId: BigInt(Date.now())
          });
        }
      } catch (err) {
        console.warn('⚠️ Failed to send keep-alive:', err.message);
      }
    }, 10000);

    // Login + GUI warp
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    clearTimeout(roamTimer);
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    if (err.message.includes('timed out')) {
      console.log('⚠️ Timeout detected. Reconnecting in 5s...');
      bot.quit();
      setTimeout(createBot, 5000);
    } else {
      console.log('❌ Error:', err.message);
    }
  });

  function openTeleportGUI(bot) {
    bot.setQuickBarSlot(0);
    bot.activateItem();
    bot.once('windowOpen', async window => {
      await bot.waitForTicks(20);
      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1);
          console.log('🎯 Clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }
      setTimeout(() => {
        bot.chat(botConfig.warpCommand);
        setTimeout(() => startPatrol(bot), 8000);
      }, 2000);
    });
  }

  function startPatrol(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

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
          console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Finding next nearest...`);
          patrolIndex = getNextNearestWaypointIndex(patrolIndex + 1);
          setTimeout(moveToNext, 800);
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
    const clickLoop = () => {
      if (!reachedGlacite) return;
      bot.setQuickBarSlot(0);
      bot.activateItem();
      setTimeout(clickLoop, 200);
    };

    const roam = () => {
      if (!reachedGlacite) return;
      const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
      const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
      const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
      const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;

      bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
      roamTimer = setTimeout(roam, 5000 + Math.random() * 3000);
    };

    roam();
    clickLoop();
  }
}

createBot();
