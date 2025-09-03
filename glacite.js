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
  username: 'JamaaLcaliph',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
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
    bot.manualQuit = false;
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (!bot.manualQuit) {
      console.log('🔁 Disconnected. Reconnecting in 10s...');
      setTimeout(() => {
        createBot();
      }, 10000);
    } else {
      console.log('🛑 Bot quit manually. No reconnect.');
    }
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
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
            console.log('🌟 Reached Glacite. Executing final right-click...');
            afterReachingGlacite();
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
            console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Finding next nearest...`);
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

  function afterReachingGlacite() {
    reachedGlacite = true;
    bot.setQuickBarSlot(2);
    bot.activateItem();

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.clearControlStates();
      console.log('🧍 Holding slot 0 and standing still.');
    }, 1000);
  }

  // ---- CHAT TRIGGER HANDLER ----
bot.on('message', (jsonMsg) => {
  if (!reachedGlacite) return;
  const msg = jsonMsg.toString().toLowerCase();

  if (
    msg.includes('1234549wonana') ||
    msg.includes('JamaaLcaliph') ||
    msg.includes('you were killed by')
  ) {
    console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
    setTimeout(() => {
      bot.quit(); // will auto-reconnect, since manualQuit not set
    }, 5000);
  }
});

  // ---- OPTIONAL: MANUAL QUIT FUNCTION ----
  bot.quitBot = function () {
    bot.manualQuit = true; // prevents reconnect
    bot.quit();
  };
}

createBot();
