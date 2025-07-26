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
let clickLoopActive = false;
let proximityInterval;

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
      if (bot.chat) bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    clearTimeout(roamTimer);
    clearInterval(proximityInterval);
    clickLoopActive = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    clearInterval(proximityInterval);
    clickLoopActive = false;
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });

  bot.on('chat', (username, message) => {
    if (reachedGlacite && message.toLowerCase().includes('drakontide')) {
      console.log(`💬 Mention detected: ${message} — Reconnecting...`);
      bot.quit('Restarting due to name mention');
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
  movements.maxJumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  function moveToNext() {
    if (patrolIndex >= botConfig.waypoints.length) patrolIndex = botConfig.waypoints.length - 1;
    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const distXZ = Math.hypot(
        bot.entity.position.x - target.x,
        bot.entity.position.z - target.z
      );
      if (distXZ < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          console.log('🌟 Reached Glacite. Starting roam mode...');
          startRoam(bot);
        } else {
          patrolIndex++;
          setTimeout(moveToNext, 600);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(moveToNext, 600);
      }
    }, 500);
  }

  moveToNext();
}

function startRoam(bot) {
  const roam = () => {
    if (!reachedGlacite) return;

    const offsetX = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const offsetZ = Math.floor(Math.random() * botConfig.roamRadius * 2) - botConfig.roamRadius;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
    roamTimer = setTimeout(roam, 5000 + Math.random() * 3000);
  };

  const clickLoop = () => {
    if (!clickLoopActive) return;

    const nearbyPlayer = bot.players && Object.values(bot.players).find(p =>
      p.entity && p.username !== bot.username &&
      p.entity.position.distanceTo(bot.entity.position) < 10
    );

    if (!nearbyPlayer) {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }

    setTimeout(clickLoop, 200); // Keep spamming
  };

  roam();
  clickLoopActive = true;
  clickLoop();

  proximityInterval = setInterval(() => {
    const near = Object.values(bot.players).some(p =>
      p.entity && p.username !== bot.username &&
      p.entity.position.distanceTo(bot.entity.position) < 10
    );

    if (near && clickLoopActive) {
      console.log('🛑 Player nearby. Stopping clicks.');
      clickLoopActive = false;
    } else if (!near && !clickLoopActive) {
      console.log('✅ Player left. Resuming clicks.');
      clickLoopActive = true;
      clickLoop();
    }
  }, 1000);
}

createBot();
