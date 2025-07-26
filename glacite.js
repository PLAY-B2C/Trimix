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
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55),
    new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -23),
    new Vec3(-53, 147, -12),
    new Vec3(-51, 137, 17),
    new Vec3(-28, 131, 31),
    new Vec3(-7, 128, 59),
    new Vec3(0, 128, 160)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let roamTimer = null;
let proximityTimer = null;

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
      console.log('🔁 Chat trigger restart');
      restartPatrol(bot);
    }
  });

  bot.on('physicTick', () => {
    if (reachedGlacite) bot.activateItem();
    detectNearbyPlayers(bot);
  });

  bot.on('death', () => {
    console.log('☠️ Died. Resetting...');
    restartPatrol(bot);
  });

  bot.on('end', () => {
    console.log('🔁 Reconnecting...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
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
  movements.maxJumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canDig = false;

  bot.pathfinder.setMovements(movements);

  function moveToNext() {
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.waypoints.length - 1;
    }

    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const distXZ = bot.entity.position.distanceTo(new Vec3(target.x, bot.entity.position.y, target.z));

      if (distXZ < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          console.log('🌟 Reached Glacite. Starting roam...');
          startRoaming(bot);
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
  if (roamTimer) clearTimeout(roamTimer);

  const roam = () => {
    if (!reachedGlacite) return;

    const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const roamTarget = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(roamTarget)?.position.y || botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(roamTarget.x, y, roamTarget.z, 1));
    roamTimer = setTimeout(roam, 5000 + Math.random() * 3000);
  };

  roam();
}

function detectNearbyPlayers(bot) {
  const player = bot.nearestEntity(entity => entity.type === 'player' && entity.username !== bot.username);
  if (!player) {
    if (proximityTimer) clearTimeout(proximityTimer);
    proximityTimer = null;
    return;
  }

  if (!proximityTimer) {
    proximityTimer = setTimeout(() => {
      console.log('👤 Player nearby for 10s. Restarting...');
      restartPatrol(bot);
    }, 10000);
  }
}

function restartPatrol(bot) {
  patrolIndex = 0;
  reachedGlacite = false;
  if (roamTimer) clearTimeout(roamTimer);
  if (proximityTimer) clearTimeout(proximityTimer);
  bot.chat(botConfig.warpCommand);
  setTimeout(() => startPatrol(bot), 8000);
}

createBot();
