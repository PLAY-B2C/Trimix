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
  warpCommand: '/warp spider',
  waypoints: [
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-281, 95, -233),
    new Vec3(-292, 95, -211),
    new Vec3(-315, 96, -191),
    new Vec3(-331, 81, -228),
    new Vec3(-302, 67, -273), // 🏠 home
    new Vec3(-299, 67, -284),
    new Vec3(-282, 65, -295),
    new Vec3(-258, 61, -273),
    new Vec3(-282, 65, -295)
  ]
};

let patrolIndex = 0;
let homeReached = false;
let clickInterval = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version
  });

  // ⏱️ Set client timeout to 24 hours + keep alive
  if (bot._client && bot._client.socket) {
    bot._client.socket.setTimeout(24 * 60 * 60 * 1000); // 24 hours in ms
    bot._client.socket.setKeepAlive(true, 10000); // send keepalive every 10s
  }

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    patrolIndex = 0;
    homeReached = false;
    stopClicking();
    bot.manualQuit = false;
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    homeReached = false;
    stopClicking();
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
      if (patrolIndex >= botConfig.waypoints.length) {
        patrolIndex = 6; // restart from home
      }

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

          if (patrolIndex === 6 && !homeReached) {
            console.log('🏠 Reached patrol home. Enabling chat triggers + starting right click spam...');
            homeReached = true;
            startClicking();
          }

          patrolIndex++;
          setTimeout(moveToNext, 600);
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

  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    clickInterval = setInterval(() => {
      bot.activateItem();
    }, 600);
  }

  function stopClicking() {
    if (clickInterval) {
      clearInterval(clickInterval);
      clickInterval = null;
    }
  }

  bot.on('message', (jsonMsg) => {
    if (!homeReached) return;
    const msg = jsonMsg.toString().toLowerCase();
    if (
      msg.includes('jamaalcaliph') ||
      msg.includes('you were killed by')
    ) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => {
        bot.quit();
      }, 5000);
    }
  });

  bot.quitBot = function () {
    bot.manualQuit = true;
    bot.quit();
  };
}

createBot();
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
      if (patrolIndex >= botConfig.waypoints.length) {
        patrolIndex = 6; // restart from home
      }

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

          if (patrolIndex === 6 && !homeReached) {
            console.log('🏠 Reached patrol home. Enabling chat triggers + starting right click spam...');
            homeReached = true;
            startClicking();
          }

          patrolIndex++;
          setTimeout(moveToNext, 600);
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

  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    clickInterval = setInterval(() => {
      bot.activateItem();
    }, 600);
  }

  function stopClicking() {
    if (clickInterval) {
      clearInterval(clickInterval);
      clickInterval = null;
    }
  }

  bot.on('message', (jsonMsg) => {
    if (!homeReached) return;
    const msg = jsonMsg.toString().toLowerCase();
    if (
      msg.includes('jamaalcaliph') ||
      msg.includes('you were killed by')
    ) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => {
        bot.quit();
      }, 5000);
    }
  });

  bot.quitBot = function () {
    bot.manualQuit = true;
    bot.quit();
  };
}

createBot();
    moveToNext();
  }

  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    clickInterval = setInterval(() => {
      bot.activateItem();
    }, 600);
  }

  function stopClicking() {
    if (clickInterval) {
      clearInterval(clickInterval);
      clickInterval = null;
    }
  }

  bot.on('message', (jsonMsg) => {
    if (!homeReached) return;
    const msg = jsonMsg.toString().toLowerCase();
    if (
      msg.includes('jamaalcaliph') ||
      msg.includes('you were killed by')
    ) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => {
        bot.quit();
      }, 5000);
    }
  });

  bot.quitBot = function () {
    bot.manualQuit = true;
    bot.quit();
  };
}

createBot();
