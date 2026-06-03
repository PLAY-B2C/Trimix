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
  host: 'fakepixel.fun',
  username: 'JamaaLcaliph',
  version: '1.8.9',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp spider',
  waypointRadius: 3,
  homeIndex: 11,
  loopStartIndex: 11,
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
let patrolActive = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    try {
      bot._client.socket.setTimeout(24 * 60 * 60 * 1000);
      bot._client.socket.setKeepAlive(true, 10000);
    } catch (_) {}
    console.log('✅ Spawned');
    patrolIndex = 0;
    homeReached = false;
    patrolActive = false;
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
    patrolActive = false;
    stopClicking();
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    patrolActive = false;
    stopClicking();
    if (!bot.manualQuit) {
      console.log('🔁 Disconnected. Reconnecting in 10s...');
      setTimeout(createBot, 10000);
    } else {
      console.log('🛑 Bot quit manually. No reconnect.');
    }
  });

  bot.on('error', err => console.log('❌ Error:', err.message));

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
    if (patrolActive) return;
    patrolActive = true;

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    movements.allowSprinting = true;
    movements.canUseElytra = false;
    bot.pathfinder.setMovements(movements);

    console.log('🚶 Patrol started.');
    moveToWaypoint();
  }

  function moveToWaypoint() {
    if (!patrolActive) return;

    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.loopStartIndex;
    }

    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1), true);

    let stuckTicks = 0;
    let lastPos = bot.entity.position.clone();

    const poll = setInterval(() => {
      if (!patrolActive) { clearInterval(poll); return; }

      const pos = bot.entity.position;
      const distXZ = Math.hypot(pos.x - target.x, pos.z - target.z);

      if (distXZ <= botConfig.waypointRadius) {
        clearInterval(poll);
        console.log(`📍 Passed waypoint ${patrolIndex}`);

        if (patrolIndex === botConfig.homeIndex && !homeReached) {
          console.log('🏠 Home reached — starting right-click spam...');
          homeReached = true;
          startClicking();
        }

        patrolIndex++;
        moveToWaypoint();
        return;
      }

      const moved = pos.distanceTo(lastPos);
      if (moved < 0.05) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
        lastPos = pos.clone();
      }

      if (stuckTicks >= 30) {
        stuckTicks = 0;
        console.log(`⚠️ Stuck near waypoint ${patrolIndex}, retrying goal...`);
        bot.pathfinder.setGoal(null);
        setTimeout(() => {
          if (!patrolActive) return;
          bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1), true);
        }, 300);
      }
    }, 100);
  }

  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    clickInterval = setInterval(() => {
      if (patrolActive) bot.activateItem();
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
    if (msg.includes('drakontide') || msg.includes('you were killed by')) {
      console.log('📨 Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => bot.quit(), 5000);
    }
  });

  bot.quitBot = function () {
    bot.manualQuit = true;
    patrolActive = false;
    stopClicking();
    bot.quit();
  };
}

createBot();
