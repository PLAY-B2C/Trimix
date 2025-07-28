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

    setTimeout(() => {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem();
        console.log('🟢 Activated item in slot 0');
      } catch (err) {
        console.log('❌ Activation failed:', err.message);
      }
    }, 1000);

    bot.once('windowOpen', async (window) => {
      console.log('📂 GUI opened');
      await bot.waitForTicks(20); // 1 second

      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1); // Shift-click
          console.log('✅ Shift-clicked slot 20');
        } catch (err) {
          console.log('❌ Shift-click error:', err.message);
        }
      } else {
        console.log('❌ Slot 20 is empty');
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        console.log('🔥 Warped to crimson');
        setTimeout(() => {
          startPatrol(bot);
        }, 8000); // Wait 8s after warp
      }, 2000); // Wait 2s after click
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

  // Leech loop: every 2 min, move forward, wait 1s, go back
  setInterval(async () => {
    const forward = bot.entity.yaw;
    const dir = new Vec3(Math.round(Math.cos(forward)), 0, Math.round(Math.sin(forward)));

    const forwardPos = bot.entity.position.plus(dir);
    const originalGoal = new goals.GoalBlock(leechPos.x, leechPos.y, leechPos.z);

    console.log('➡️ Stepping forward briefly');
    bot.pathfinder.setGoal(new goals.GoalBlock(forwardPos.x, forwardPos.y, forwardPos.z));
    await bot.waitForTicks(20);

    console.log('↩️ Returning to leech spot');
    bot.pathfinder.setGoal(originalGoal);
    await bot.waitForTicks(20);

    try {
      await bot.lookAt(lookAtPos);
    } catch (_) {}
  }, 120000); // Every 2 minutes
}

createBot();
