const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let enableNameTrigger = false;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp crimson';
const botName = 'JamaaLcaliph';

const waypoints = [
  new Vec3(-360, 86, -591),
  new Vec3(-289, 84, -643),
  new Vec3(-262, 93, -630),
  new Vec3(-281, 101, -615),
];

const leechPos = new Vec3(-256, 111, -562);
const lookAtPos = new Vec3(-180, 111, -562);

async function safeShiftClick(bot, slotIndex, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await bot.clickWindow(slotIndex, 0, 1); // Shift-click
      console.log(`✅ Shift-clicked slot ${slotIndex} (attempt ${i + 1})`);
      return true;
    } catch (err) {
      console.log(`⚠️ Shift-click attempt ${i + 1} failed: ${err.message}`);
      await bot.waitForTicks(20); // Wait 1 second between attempts
    }
  }
  console.log(`❌ Failed to shift-click slot ${slotIndex} after ${maxAttempts} attempts`);
  return false;
}

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: botName,
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    bot.chat(loginCommand);

    // 1 second after login
    setTimeout(async () => {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem(); // Opens GUI (chest)
        console.log('🟢 Activated item in slot 0 (likely opened GUI)');
      } catch (err) {
        console.log('❌ Activation failed:', err.message);
      }
    }, 1000);

    // Wait for chest GUI to open
    bot.once('windowOpen', async (window) => {
      console.log(`📂 GUI opened: "${window.title}" (ID ${window.id})`);
      await bot.waitForTicks(40); // 2 seconds

      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        await safeShiftClick(bot, 20); // Shift-click with retries
      } else {
        console.log('❌ Slot 20 is empty or not synced yet');
      }

      // Warp after 2 seconds
      setTimeout(() => {
        bot.chat(warpCommand);
        console.log('🔥 Warped to crimson');
        setTimeout(() => {
          startPatrol(bot);
        }, 8000);
      }, 2000);
    });

    startRightClickLoop(bot);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    console.log('☠️ Bot died. Restarting patrol...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol(bot);
      }, 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('chat', (username, message) => {
    if (
      enableNameTrigger &&
      username !== bot.username &&
      message.toLowerCase().includes(botName.toLowerCase())
    ) {
      console.log(`💬 Name mentioned by ${username}: "${message}" — Restarting...`);
      bot.quit(); // triggers reconnect
    }
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startRightClickLoop(bot) {
  setInterval(() => {
    if (!bot?.entity || bot.entity.health <= 0) return;
    try {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    } catch (err) {
      console.log('⚠️ Right click failed:', err.message);
    }
  }, 300);
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  enableNameTrigger = true;

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      console.log('🎯 Reached final patrol point — starting leeching mode');
      startLeeching(bot);
      return;
    }

    const target = waypoints[patrolIndex];
    if (!target) return;

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const checkInterval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(checkInterval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

function startLeeching(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  // Move to leech spot
  bot.pathfinder.setGoal(new goals.GoalBlock(leechPos.x, leechPos.y, leechPos.z));

  bot.once('goal_reached', async () => {
    console.log('🧲 Arrived at leech spot');
    await lookAndLeech(bot);
  });
}

async function lookAndLeech(bot) {
  try {
    await bot.lookAt(lookAtPos);
    console.log('👀 Looking at target position for leeching');
  } catch (err) {
    console.log('⚠️ Failed to look at position:', err.message);
  }

  // Leech loop: every 2 min, move forward briefly and return
  setInterval(async () => {
    const yaw = bot.entity.yaw;
    const dir = new Vec3(Math.round(Math.cos(yaw)), 0, Math.round(Math.sin(yaw)));
    const forwardPos = bot.entity.position.offset(dir.x, 0, dir.z);
    const returnGoal = new goals.GoalBlock(leechPos.x, leechPos.y, leechPos.z);

    console.log('➡️ Stepping forward briefly');
    bot.pathfinder.setGoal(new goals.GoalBlock(forwardPos.x, forwardPos.y, forwardPos.z));
    await bot.waitForTicks(20);

    console.log('↩️ Returning to leech spot');
    bot.pathfinder.setGoal(returnGoal);
    await bot.waitForTicks(20);

    try {
      await bot.lookAt(lookAtPos);
    } catch (_) {}
  }, 120000); // every 2 minutes
}

createBot();
