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
  username: 'B2C',
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
    new Vec3(-347, 79, -236),
    new Vec3(-360, 72, -256),
    new Vec3(-357, 67, -270),
    new Vec3(-333, 60, -276),
    new Vec3(-322, 57, -280),
    new Vec3(-300, 45, -273), // index 11 — patrol home
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
  ]
};

let patrolIndex = 0;
let homeReached = false;
let clickInterval = null;
let sellInterval = null; // auto-sell timer

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
    homeReached = false;
    stopClicking();
    bot.manualQuit = false;
    stopAutoSellTimer();
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
    stopAutoSellTimer();
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
        patrolIndex = 11;
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

          if (patrolIndex === 11 && !homeReached) {
            console.log('🏠 Reached patrol home. Enabling triggers + starting right click spam...');
            homeReached = true;
            startClicking();
            startAutoSellTimer(bot); // start 10-min auto-sell loop
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

  // ---- AUTO SELL ----
  function startAutoSellTimer(bot) {
    stopAutoSellTimer();
    sellInterval = setInterval(() => {
      doAutoSell(bot);
    }, 10 * 60 * 1000); // every 10 min
  }

  function stopAutoSellTimer() {
    if (sellInterval) {
      clearInterval(sellInterval);
      sellInterval = null;
    }
  }

  async function doAutoSell(bot) {
    try {
      console.log("💰 Starting auto-sell routine...");
      bot.chat("/bz");

      bot.once("windowOpen", async (window) => {
        try {
          await bot.waitForTicks(20); // wait ~1s for GUI to load

          try {
            await bot.clickWindow(47, 0, 1); // shift-click slot 47
            console.log("✅ Tried clicking slot 47");
          } catch (err) {
            console.log("⚠️ Slot 47 click failed:", err.message);
          }

          await bot.waitForTicks(10);

          try {
            await bot.clickWindow(11, 0, 1); // shift-click slot 11
            console.log("✅ Tried clicking slot 11");
          } catch (err) {
            console.log("⚠️ Slot 11 click failed:", err.message);
          }

        } catch (err) {
          console.log("❌ Auto-sell routine error:", err.message);
        }

        setTimeout(() => {
          bot.chat("/warp spider");
          console.log("🔄 Warping back to spider...");
          setTimeout(() => {
            patrolIndex = 0;
            homeReached = false;
            stopClicking();
            startPatrol(bot);
          }, 8000);
        }, 1500);
      });
    } catch (err) {
      console.log("❌ Auto-sell error:", err.message);
    }
  }

  // ---- CHAT TRIGGERS ----
  bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString().toLowerCase();

    if (!homeReached) return;

    if (msg.includes("sell") || msg.includes("inventory is full")) {
      doAutoSell(bot);
    }

    if (msg.includes('drakontide') || msg.includes('you were killed by')) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => {
        bot.quit(); // will auto-reconnect
      }, 5000);
    }
  });

  // ---- MANUAL QUIT ----
  bot.quitBot = function () {
    bot.manualQuit = true;
    bot.quit();
  };
}

createBot();
