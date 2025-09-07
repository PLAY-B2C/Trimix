const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

// Silence objectType warning
const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  originalWarn(msg, ...args);
};

// Both bot configs
const botsConfig = [
  {
    username: 'DrakonTide',
    loginCommand: '/login 3043AA',
    warpCommand: '/warp spider',
    waypoints: [
      new Vec3(-233, 80, -244),
      new Vec3(-261, 86, -237),
      new Vec3(-281, 95, -233),
      new Vec3(-292, 95, -211),
      new Vec3(-315, 96, -191),
      new Vec3(-331, 81, -228),
      new Vec3(-347, 79, -236),
      new Vec3(-360, 72, -256),
      new Vec3(-357, 67, -270),
      new Vec3(-333, 60, -276),
      new Vec3(-322, 57, -280),
      new Vec3(-300, 45, -273), // 🏠 home index 11
      new Vec3(-291, 45, -278),
      new Vec3(-284, 44, -250),
      new Vec3(-271, 44, -238),
      new Vec3(-273, 44, -224),
      new Vec3(-292, 43, -228),
      new Vec3(-326, 44, -224),
      new Vec3(-336, 44, -236),
      new Vec3(-326, 42, -252),
      new Vec3(-313, 43, -234),
      new Vec3(-288, 44, -259),
    ],
    homeIndex: 11
  },
  {
    username: 'JamaaLcaliph',
    loginCommand: '/login 3043AA',
    warpCommand: '/warp spider',
    waypoints: [
      new Vec3(-233, 80, -244),
      new Vec3(-261, 86, -237),
      new Vec3(-281, 95, -233),
      new Vec3(-292, 95, -211),
      new Vec3(-315, 96, -191),
      new Vec3(-331, 81, -228),
      new Vec3(-302, 67, -273), // 🏠 home index 6
      new Vec3(-299, 67, -284),
      new Vec3(-282, 65, -295),
      new Vec3(-258, 61, -273),
      new Vec3(-282, 65, -295),
    ],
    homeIndex: 6
  }
];

function createBot(config) {
  let patrolIndex = 0;
  let homeReached = false;
  let clickInterval = null;

  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: config.username,
    version: '1.16.5'
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${config.username} Spawned`);
    patrolIndex = 0;
    homeReached = false;
    stopClicking();
    bot.manualQuit = false;
    setTimeout(() => {
      bot.chat(config.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log(`☠️ ${config.username} died. Restarting patrol...`);
    patrolIndex = 0;
    homeReached = false;
    stopClicking();
    setTimeout(() => {
      bot.chat(config.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (!bot.manualQuit) {
      console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
      setTimeout(() => createBot(config), 10000);
    } else {
      console.log(`🛑 ${config.username} quit manually. No reconnect.`);
    }
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} Error:`, err.message);
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
          console.log(`🎯 ${config.username} clicked teleport item.`);
        } catch (err) {
          console.log(`❌ ${config.username} GUI click error:`, err.message);
        }
      }
      setTimeout(() => {
        bot.chat(config.warpCommand);
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
      if (patrolIndex >= config.waypoints.length) {
        patrolIndex = config.homeIndex; // loop back at home
      }

      const target = config.waypoints[patrolIndex];
      bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

      const interval = setInterval(() => {
        const distXZ = Math.hypot(
          bot.entity.position.x - target.x,
          bot.entity.position.z - target.z
        );
        if (distXZ < 2) {
          clearInterval(interval);
          retryCount = 0;
          console.log(`📍 ${config.username} reached waypoint ${patrolIndex}`);

          if (patrolIndex === config.homeIndex && !homeReached) {
            console.log(`🏠 ${config.username} reached patrol home. Starting right-click spam...`);
            homeReached = true;
            startClicking();
          }

          patrolIndex++;
          setTimeout(moveToNext, 600);
        } else if (!bot.pathfinder.isMoving()) {
          clearInterval(interval);
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔁 ${config.username} retry ${retryCount}/${maxRetries} waypoint ${patrolIndex}`);
            setTimeout(moveToNext, 800);
          } else {
            console.log(`⚠️ ${config.username} stuck. Finding nearest waypoint...`);
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
      for (let i = minIndex; i < config.waypoints.length; i++) {
        const wp = config.waypoints[i];
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
    clickInterval = setInterval(() => bot.activateItem(), 600);
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
      msg.includes(config.username.toLowerCase()) ||
      msg.includes('you were killed by')
    ) {
      console.log(`📨 ${config.username} trigger detected. Disconnecting in 5s...`);
      setTimeout(() => bot.quit(), 5000);
    }
  });

  bot.quitBot = function () {
    bot.manualQuit = true;
    bot.quit();
  };
}

// Run bots: first instantly, second after 24h
createBot(botsConfig[0]);
setTimeout(() => createBot(botsConfig[1]), 24 * 60 * 60 * 1000); // 24h = 86,400,000 ms
