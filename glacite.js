const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
  roamRadius: 15,
  waypoints: [ /* same as before */ ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let roamTimer = null;
let rightClickTimer = null;
let nearbyPlayerStartTime = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('chat', (username, message) => {
    if (message.includes('DrakonTide')) {
      resetPatrol(bot);
    }
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Resetting...');
    resetPatrol(bot);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });

  monitorPlayers(bot);
}

function openTeleportGUI(bot) {
  bot.setQuickBarSlot(0);
  bot.activateItem();

  bot.once('windowOpen', async window => {
    await bot.waitForTicks(20);
    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 1);
      } catch (err) {}
    }

    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });
}

function resetPatrol(bot) {
  patrolIndex = 0;
  reachedGlacite = false;
  if (roamTimer) clearTimeout(roamTimer);
  if (rightClickTimer) clearInterval(rightClickTimer);
  bot.chat(botConfig.warpCommand);
  setTimeout(() => startPatrol(bot), 8000);
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.maxJumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  function moveToNext() {
    if (patrolIndex >= botConfig.waypoints.length) patrolIndex = botConfig.waypoints.length - 1;
    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(interval);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          startRoaming(bot);
          startRightClickLoop(bot);
        } else {
          patrolIndex++;
          setTimeout(moveToNext, 600);
        }
      } else if (!bot.pathfinder.isMoving()) {
        clearInterval(interval);
        patrolIndex++;
        setTimeout(moveToNext, 600);
      }
    }, 500);
  }

  moveToNext();
}

function startRoaming(bot) {
  const roam = () => {
    if (!reachedGlacite) return;

    const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
    roamTimer = setTimeout(roam, 4000 + Math.random() * 4000);
  };

  roam();
}

function startRightClickLoop(bot) {
  if (rightClickTimer) clearInterval(rightClickTimer);
  rightClickTimer = setInterval(() => {
    if (reachedGlacite && bot.entity?.health > 0) {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem();
      } catch {}
    }
  }, 300);
}

function monitorPlayers(bot) {
  setInterval(() => {
    if (!reachedGlacite) return;

    const player = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username);
    if (player) {
      if (!nearbyPlayerStartTime) {
        nearbyPlayerStartTime = Date.now();
      } else if (Date.now() - nearbyPlayerStartTime >= 10000) {
        console.log('👤 Player nearby too long — resetting...');
        resetPatrol(bot);
      }
    } else {
      nearbyPlayerStartTime = null;
    }
  }, 1000);
}

createBot();
