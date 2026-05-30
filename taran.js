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
  version: '1.8.9',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp arachne',
  glaciteCenter: new Vec3(0, 128, 160),
  waypoints: [
    new Vec3(-271, 44, -239),
    new Vec3(-235, 46, -255),
    new Vec3(-208, 42, -260),
    new Vec3(-246, 44, -294)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let idleMovementInterval = null;

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
      setTimeout(() => openTeleportGUI(bot), 3000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    stopIdleMovement();
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    stopIdleMovement();
    if (!bot.manualQuit) {
      console.log('🔄 Disconnected. Reconnecting in 10s...');
      setTimeout(() => createBot(), 10000);
    } else {
      console.log('🛑 Bot quit manually. No reconnect.');
    }
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });

  bot.on('message', (jsonMsg, position) => {
    if (position !== 'chat' && position !== 'system') return;

    const text = jsonMsg.toString();
    console.log(`[CHAT] ${text}`);

    if (!reachedGlacite) return;
    const lower = text.toLowerCase();
    if (
      lower.includes('this server will restart') ||
      lower.includes('you were killed by')
    ) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => bot.quit(), 5000);
    }
  });

  function openTeleportGUI(bot) {
    bot.setQuickBarSlot(0);
    bot.activateItem();

    const guiTimeout = setTimeout(() => {
      console.log('⚠️ windowOpen timed out. Warping directly...');
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 5000);

    bot.once('windowOpen', async window => {
      clearTimeout(guiTimeout);
      await bot.waitForTicks(20);
      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 0);
          console.log('🎯 Clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 20 empty, skipping click.');
      }
      setTimeout(() => {
        bot.chat(botConfig.warpCommand);
        setTimeout(() => startPatrol(bot), 8000);
      }, 2000);
    });
  }

  function startPatrol(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot);
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
            console.log(`⚠️ Stuck at waypoint ${patrolIndex} after ${maxRetries} retries. Disconnecting to reconnect...`);
            bot.quit();
          }
        }
      }, 500);
    }

    moveToNext();
  }

  // Walks forward 2 blocks, waits, then walks backward 2 blocks
  async function doIdleNudge() {
    if (!reachedGlacite) return;
    console.log('🚶 Idle nudge: moving forward 2 blocks...');

    bot.setControlState('forward', true);
    await new Promise(r => setTimeout(r, 800)); // ~2 blocks at walk speed
    bot.setControlState('forward', false);

    await new Promise(r => setTimeout(r, 500));

    console.log('🚶 Idle nudge: moving backward 2 blocks...');
    bot.setControlState('back', true);
    await new Promise(r => setTimeout(r, 800));
    bot.setControlState('back', false);

    console.log('🧍 Idle nudge complete. Standing still.');
  }

  function stopIdleMovement() {
    if (idleMovementInterval) {
      clearInterval(idleMovementInterval);
      idleMovementInterval = null;
    }
  }

  function afterReachingGlacite() {
    reachedGlacite = true;
    bot.setQuickBarSlot(2);
    bot.activateItem();

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.clearControlStates();
      console.log('🧍 Holding slot 0 and standing still.');

      // Start idle movement loop: nudge every 6 minutes
      stopIdleMovement(); // clear any existing interval
      idleMovementInterval = setInterval(() => {
        doIdleNudge();
      }, 6 * 60 * 1000); // every 6 minutes

    }, 1000);
  }

  bot.quitBot = function () {
    bot.manualQuit = true;
    stopIdleMovement();
    bot.quit();
  };
}

createBot();
