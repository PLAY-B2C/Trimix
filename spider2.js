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
  version: '1.8.9',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp spider',
  waypoints: [
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-281, 95, -233),
    new Vec3(-292, 95, -211),
    new Vec3(-315, 96, -191),
    new Vec3(-331, 81, -228),
    new Vec3(-302, 67, -273), // 🏠 home (index 6)
    new Vec3(-299, 67, -284),
    new Vec3(-282, 65, -295),
    new Vec3(-258, 61, -273),
    new Vec3(-282, 65, -295)
  ],
  // How close (XZ) the bot needs to be to consider a waypoint "passed"
  waypointRadius: 3,
  // Home waypoint index
  homeIndex: 6,
  // Loop restarts from this index after reaching the end
  loopStartIndex: 6
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
    // Socket is guaranteed live by the time spawn fires
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

  // ─── Teleport GUI ───────────────────────────────────────────────────────────
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

  // ─── Patrol ─────────────────────────────────────────────────────────────────
  function startPatrol(bot) {
    if (patrolActive) return;
    patrolActive = true;

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    movements.allowSprinting = true;
    movements.canUseElytra = false; // not in 1.8.9
    bot.pathfinder.setMovements(movements);

    console.log('🚶 Patrol started.');
    moveToWaypoint();
  }

  // Core smooth patrol: sets goal, polls XZ distance every 100ms,
  // advances as soon as the bot is within radius — no waiting for pathfinder
  // "goal reached" event which can cause a full stop.
  function moveToWaypoint() {
    if (!patrolActive) return;

    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.loopStartIndex;
    }

    const target = botConfig.waypoints[patrolIndex];

    // Use a loose GoalNear so pathfinder keeps moving toward it
    // but we detect arrival ourselves to chain smoothly
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1), true);

    let stuckTicks = 0;
    let lastPos = bot.entity.position.clone();

    const poll = setInterval(() => {
      if (!patrolActive) { clearInterval(poll); return; }

      const pos = bot.entity.position;
      const distXZ = Math.hypot(pos.x - target.x, pos.z - target.z);

      // ── Arrived? ──────────────────────────────────────────────────────────
      if (distXZ <= botConfig.waypointRadius) {
        clearInterval(poll);

        console.log(`📍 Passed waypoint ${patrolIndex}`);

        if (patrolIndex === botConfig.homeIndex && !homeReached) {
          console.log('🏠 Home reached — starting right-click spam...');
          homeReached = true;
          startClicking();
        }

        patrolIndex++;
        // No delay — chain immediately for smooth flow
        moveToWaypoint();
        return;
      }

      // ── Stuck detection ───────────────────────────────────────────────────
      const moved = pos.distanceTo(lastPos);
      if (moved < 0.05) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
        lastPos = pos.clone();
      }

      // If stuck for ~3 seconds (30 × 100ms), retry goal
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

  // ─── Right-click spam ────────────────────────────────────────────────────────
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

  // ─── Chat triggers ───────────────────────────────────────────────────────────
  bot.on('message', (jsonMsg) => {
    if (!homeReached) return;
    const msg = jsonMsg.toString().toLowerCase();
    if (msg.includes('jamaalcaliph') || msg.includes('you were killed by')) {
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
