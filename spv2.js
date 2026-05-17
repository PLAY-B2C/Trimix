const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

// ─── Suppress noisy deprecation warnings ────────────────────────────────────
const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  originalWarn(msg, ...args);
};

// ─── Config ──────────────────────────────────────────────────────────────────
const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp spider',

  // Index of the "home base" waypoint where farming begins
  patrolHomeIndex: 11,

  // Min health (out of 20) before bot tries to escape / stop clicking
  lowHealthThreshold: 6,

  // Reconnect delay in ms (doubles each failure, capped at maxReconnectDelay)
  baseReconnectDelay: 10_000,
  maxReconnectDelay: 120_000,

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
    new Vec3(-300, 45, -273), // index 11 — patrol home / farm start
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
};

// ─── State ───────────────────────────────────────────────────────────────────
let reconnectDelay = botConfig.baseReconnectDelay;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(icon, ...args) {
  console.log(`[${new Date().toLocaleTimeString()}] ${icon}`, ...args);
}

// ─── Bot factory ─────────────────────────────────────────────────────────────
function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
  });

  bot.loadPlugin(pathfinder);

  // ── Internal state ────────────────────────────────────────────────────────
  let patrolIndex = 0;
  let homeReached = false;
  let clickInterval = null;
  let patrolCheckInterval = null;
  let manualQuit = false;
  let isLowHealth = false;
  let guiTimeout = null;

  // ── Clicking ─────────────────────────────────────────────────────────────
  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    clickInterval = setInterval(() => {
      try {
        bot.setQuickBarSlot(0); // re-confirm slot each tick
        bot.activateItem();
      } catch (_) {}
    }, 600);
    log('🖱️', 'Right-click spam started.');
  }

  function stopClicking() {
    if (clickInterval) {
      clearInterval(clickInterval);
      clickInterval = null;
    }
  }

  function stopPatrolCheck() {
    if (patrolCheckInterval) {
      clearInterval(patrolCheckInterval);
      patrolCheckInterval = null;
    }
  }

  // ── GUI teleport ──────────────────────────────────────────────────────────
  async function openTeleportGUI() {
    bot.setQuickBarSlot(0);
    bot.activateItem();

    // Wait up to 5 s for the window to open
    const window = await new Promise(resolve => {
      guiTimeout = setTimeout(() => resolve(null), 5000);
      bot.once('windowOpen', w => {
        clearTimeout(guiTimeout);
        resolve(w);
      });
    });

    if (!window) {
      log('⚠️', 'GUI never opened. Falling back to warp command.');
      bot.chat(botConfig.warpCommand);
      await sleep(8000);
      startPatrol();
      return;
    }

    await sleep(1000); // wait for slots to populate (replaces missing waitForTicks)

    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 0); // left-click (mode 0, not 1)
        log('🎯', 'Clicked teleport item.');
      } catch (err) {
        log('❌', 'GUI click error:', err.message);
      }
    } else {
      log('⚠️', 'Slot 20 empty or air. Using warp command instead.');
      bot.closeWindow(window);
      bot.chat(botConfig.warpCommand);
    }

    await sleep(2000);
    bot.chat(botConfig.warpCommand);
    await sleep(8000);
    startPatrol();
  }

  // ── Patrol ───────────────────────────────────────────────────────────────
  function startPatrol() {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

    patrolIndex = 0;
    log('🚶', 'Patrol started.');
    moveToNext();
  }

  function moveToNext() {
    stopPatrolCheck();

    // After last waypoint, loop back to home
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.patrolHomeIndex;
    }

    const target = botConfig.waypoints[patrolIndex];
    log('📍', `Moving to waypoint ${patrolIndex}: ${target}`);

    // Use Y-3 to handle slight elevation differences
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    let retryCount = 0;
    const maxRetries = 3;
    let lastPos = bot.entity.position.clone();
    let stuckTicks = 0;

    patrolCheckInterval = setInterval(() => {
      const pos = bot.entity.position;
      const distXZ = Math.hypot(pos.x - target.x, pos.z - target.z);

      // ── Reached waypoint ──
      if (distXZ < 2) {
        stopPatrolCheck();
        retryCount = 0;
        log('✅', `Reached waypoint ${patrolIndex}`);

        if (patrolIndex === botConfig.patrolHomeIndex && !homeReached) {
          log('🏠', 'Reached patrol home. Enabling farming mode.');
          homeReached = true;
          startClicking();
        }

        patrolIndex++;
        setTimeout(moveToNext, 600);
        return;
      }

      // ── Stuck detection ──
      const moved = pos.distanceTo(lastPos);
      lastPos = pos.clone();
      if (moved < 0.1) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
      }

      // Consider stuck after ~5 s of no movement
      if (stuckTicks > 10 || (!bot.pathfinder.isMoving() && distXZ > 2)) {
        stopPatrolCheck();
        retryCount++;
        stuckTicks = 0;

        if (retryCount <= maxRetries) {
          log('🔁', `Retry ${retryCount}/${maxRetries} for waypoint ${patrolIndex}`);
          // Try jumping to unstick
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 400);
          setTimeout(moveToNext, 800);
        } else {
          log('⚠️', `Skipping stuck waypoint ${patrolIndex}. Finding next nearest...`);
          patrolIndex = getNextNearestWaypointIndex(patrolIndex + 1);
          retryCount = 0;
          setTimeout(moveToNext, 800);
        }
      }
    }, 500);
  }

  function getNextNearestWaypointIndex(minIndex = 0) {
    const pos = bot.entity.position;
    // Clamp minIndex so we never go out of range
    if (minIndex >= botConfig.waypoints.length) {
      return botConfig.patrolHomeIndex;
    }
    let nearestIndex = minIndex;
    let minDist = Infinity;
    for (let i = minIndex; i < botConfig.waypoints.length; i++) {
      const dist = pos.distanceTo(botConfig.waypoints[i]);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }

  // ── Health monitoring ─────────────────────────────────────────────────────
  bot.on('health', () => {
    const hp = bot.health;

    if (hp <= botConfig.lowHealthThreshold && !isLowHealth) {
      isLowHealth = true;
      log('❤️', `Low health (${hp.toFixed(1)}). Stopping attacks and retreating.`);
      stopClicking();
      // Optionally: bot.chat('/spawn') or retreat to a safe waypoint
    }

    if (hp > botConfig.lowHealthThreshold + 2 && isLowHealth) {
      isLowHealth = false;
      log('💚', `Health recovered (${hp.toFixed(1)}). Resuming attacks.`);
      if (homeReached) startClicking();
    }
  });

  // ── Chat trigger handler ──────────────────────────────────────────────────
  bot.on('message', jsonMsg => {
    const msg = jsonMsg.toString().toLowerCase();

    // Always log chat for debugging
    log('💬', msg);

    // Only act on triggers once farming has started
    if (!homeReached) return;

    const triggerWords = [
      botConfig.username.toLowerCase(),
      'you were killed by',
      'disconnected',
    ];

    if (triggerWords.some(t => msg.includes(t))) {
      log('📨', 'Trigger phrase detected. Disconnecting in 5s...');
      setTimeout(() => {
        bot.quit();
      }, 5000);
    }
  });

  // ── Spawn ─────────────────────────────────────────────────────────────────
  bot.once('spawn', async () => {
    log('✅', 'Spawned');
    reconnectDelay = botConfig.baseReconnectDelay; // reset delay on success
    patrolIndex = 0;
    homeReached = false;
    isLowHealth = false;
    stopClicking();
    manualQuit = false;

    await sleep(2000);
    bot.chat(botConfig.loginCommand);
    await sleep(2000);
    openTeleportGUI();
  });

  // ── Death ─────────────────────────────────────────────────────────────────
  bot.on('death', async () => {
    log('☠️', 'Bot died. Waiting for respawn...');
    patrolIndex = 0;
    homeReached = false;
    isLowHealth = false;
    stopClicking();
    stopPatrolCheck();

    // Wait for respawn screen to clear before issuing commands
    await sleep(3000);
    bot.chat(botConfig.warpCommand);
    await sleep(8000);
    startPatrol();
  });

  // ── Disconnect / reconnect ────────────────────────────────────────────────
  bot.on('end', () => {
    stopClicking();
    stopPatrolCheck();
    clearTimeout(guiTimeout);

    if (!manualQuit) {
      log('🔁', `Disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
      setTimeout(createBot, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, botConfig.maxReconnectDelay);
    } else {
      log('🛑', 'Bot quit manually. No reconnect.');
    }
  });

  // ── Error ─────────────────────────────────────────────────────────────────
  bot.on('error', err => {
    log('❌', 'Error:', err.message);
  });

  // ── Expose manual quit ────────────────────────────────────────────────────
  bot.quitBot = () => {
    manualQuit = true;
    bot.quit();
  };

  return bot;
}

// ─── Entry point ─────────────────────────────────────────────────────────────
createBot();
