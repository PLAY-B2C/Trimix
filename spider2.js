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
  username: 'DrakonTide',
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
  waypointRadius: 3,
  homeIndex: 6,
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
    let stuckRetries = 0;  // normal goal-retry counter (max 3)
    let jumpRetries  = 0;  // jump-assist retry counter  (max 3)

    const poll = setInterval(() => {
      if (!patrolActive) { clearInterval(poll); return; }

      const pos = bot.entity.position;
      const distXZ = Math.hypot(pos.x - target.x, pos.z - target.z);

      // ── Arrived ────────────────────────────────────────────────────────────
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

      // ── Stuck detection (no movement for 3 s = 30 × 100 ms) ───────────────
      const moved = pos.distanceTo(lastPos);
      if (moved < 0.05) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
        lastPos = pos.clone();
      }

      if (stuckTicks < 30) return;
      stuckTicks = 0;
      lastPos = pos.clone();

      // ── Phase 1: normal goal retry (up to 3×) ─────────────────────────────
      if (stuckRetries < 3) {
        stuckRetries++;
        console.log(`⚠️ Stuck at waypoint ${patrolIndex} — goal retry ${stuckRetries}/3`);
        bot.pathfinder.setGoal(null);
        setTimeout(() => {
          if (!patrolActive) return;
          bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1), true);
        }, 300);
        return;
      }

      // ── Phase 2: jump + retry (up to 3×) ──────────────────────────────────
      if (jumpRetries < 3) {
        jumpRetries++;
        console.log(`🦘 Jump-assist attempt ${jumpRetries}/3 at waypoint ${patrolIndex}`);
        bot.pathfinder.setGoal(null);

        let jumps = 0;
        const jumpTimer = setInterval(() => {
          if (!patrolActive) { clearInterval(jumpTimer); return; }
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 150);
          jumps++;
          if (jumps >= 4) {
            clearInterval(jumpTimer);
            stuckRetries = 0; // reset so it gets 3 more normal retries after jump
            setTimeout(() => {
              if (!patrolActive) return;
              bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1), true);
            }, 300);
          }
        }, 250);
        return;
      }

      // ── Phase 3: all retries exhausted → disconnect & reconnect ───────────
      clearInterval(poll);
      console.log(`❌ Waypoint ${patrolIndex} unreachable after all retries. Disconnecting to reconnect...`);
      patrolActive = false;
      stopClicking();
      bot.quit(); // manualQuit is false → end handler reconnects in 10s
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
