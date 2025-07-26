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
let nearbyPlayer = null;
let playerSeenTime = null;

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

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting...');
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting...');
    setTimeout(createBot, 10000);
  });

  bot.on('chat', (username, message) => {
    if (username !== bot.username && message.toLowerCase().includes('drakontide')) {
      restartPatrol(bot);
    }
  });

  bot.on('physicTick', () => {
    if (!reachedGlacite) return;
    const players = Object.values(bot.players).filter(p =>
      p?.entity && p.username !== bot.username &&
      p.entity.position.distanceTo(bot.entity.position) < 6
    );
    if (players.length > 0) {
      if (!playerSeenTime) playerSeenTime = Date.now();
      if (Date.now() - playerSeenTime >= 10000) {
        restartPatrol(bot);
      }
    } else {
      playerSeenTime = null;
    }
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

  movements.maxJumpHeight = 4;
  movements.allowParkour = true;
  movements.canDig = false;

  bot.pathfinder.setMovements(movements);

  function moveToNext() {
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.waypoints.length - 1;
    }

    const target = botConfig.waypoints[patrolIndex];
    if (!target) return;

    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const distXZ = Math.sqrt(
        Math.pow(bot.entity.position.x - target.x, 2) +
        Math.pow(bot.entity.position.z - target.z, 2)
      );

      if (distXZ < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          console.log('🌟 At Glacite. Roaming...');
          roamInGlacite(bot);
        } else {
          patrolIndex++;
          setTimeout(moveToNext, 600);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(moveToNext, 600);
      }
    }, 500);
  }

  moveToNext();
}

function roamInGlacite(bot) {
  if (roamTimer) clearTimeout(roamTimer);

  const roam = () => {
    if (!reachedGlacite) return;

    const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
    bot.setQuickBarSlot(0);
    bot.activateItem();

    roamTimer = setTimeout(roam, 5000 + Math.random() * 3000);
  };

  roam();
}

function restartPatrol(bot) {
  console.log('🔄 Restarting patrol...');
  reachedGlacite = false;
  patrolIndex = 0;
  if (roamTimer) clearTimeout(roamTimer);
  bot.chat(botConfig.warpCommand);
  setTimeout(() => startPatrol(bot), 8000);
}

createBot();
