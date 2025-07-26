const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const botSettings = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
  roamRadius: 15,
  waypoints: [
    new Vec3(66, 200, -104), new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55), new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -23), new Vec3(-53, 147, -12),
    new Vec3(-51, 137, 17), new Vec3(-28, 131, 31),
    new Vec3(-7, 128, 59), new Vec3(0, 128, 160)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let roamInterval = null;
let clickInterval = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: botSettings.host,
    username: botSettings.username,
    version: botSettings.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    bot.chat(botSettings.loginCommand);
    setTimeout(() => openWarpMenu(bot), 3000);
  });

  bot.on('chat', (username, message) => {
    if (reachedGlacite && message.includes('DrakonTide') && username !== bot.username) {
      console.log(`🔌 Mention detected by ${username}. Restarting...`);
      bot.quit();
      setTimeout(createBot, 8000);
    }
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting...');
    resetState();
    setTimeout(() => {
      bot.chat(botSettings.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting...');
    resetState();
    setTimeout(createBot, 10000);
  });

  function resetState() {
    patrolIndex = 0;
    reachedGlacite = false;
    clearTimeout(roamInterval);
    clearInterval(clickInterval);
  }

  function openWarpMenu(bot) {
    bot.setQuickBarSlot(0);
    bot.activateItem();
    bot.once('windowOpen', async window => {
      await bot.waitForTicks(20);
      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        await bot.clickWindow(20, 0, 1);
        console.log('🌀 Warping...');
      }
      setTimeout(() => bot.chat(botSettings.warpCommand), 2000);
      setTimeout(() => startPatrol(bot), 8000);
    });
  }

  function startPatrol(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = false;
    movements.allowParkour = true;
    bot.pathfinder.setMovements(movements);

    const moveToNextWaypoint = () => {
      if (patrolIndex >= botSettings.waypoints.length) {
        patrolIndex = botSettings.waypoints.length - 1;
      }

      const target = botSettings.waypoints[patrolIndex];
      bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

      const checkArrival = setInterval(() => {
        const dx = bot.entity.position.x - target.x;
        const dz = bot.entity.position.z - target.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 2) {
          clearInterval(checkArrival);
          console.log(`📍 Reached waypoint ${patrolIndex}`);
          if (patrolIndex === botSettings.waypoints.length - 1) {
            reachedGlacite = true;
            console.log('🌟 Reached Glacite area. Roaming...');
            startRoaming(bot);
          } else {
            patrolIndex++;
            setTimeout(moveToNextWaypoint, 600);
          }
        } else if (!bot.pathfinder.isMoving()) {
          clearInterval(checkArrival);
          console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Skipping...`);
          patrolIndex++;
          setTimeout(moveToNextWaypoint, 600);
        }
      }, 500);
    };

    moveToNextWaypoint();
  }

  function startRoaming(bot) {
    const roam = () => {
      if (!reachedGlacite) return;

      const offsetX = Math.floor(Math.random() * botSettings.roamRadius * 2) - botSettings.roamRadius;
      const offsetZ = Math.floor(Math.random() * botSettings.roamRadius * 2) - botSettings.roamRadius;
      const target = botSettings.glaciteCenter.offset(offsetX, 0, offsetZ);
      const y = bot.blockAt(target)?.position.y || botSettings.glaciteCenter.y;

      bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));

      roamInterval = setTimeout(roam, 5000 + Math.random() * 3000);
    };

    const clickLoop = () => {
      if (!reachedGlacite) return;

      const nearbyPlayers = Object.values(bot.players).filter(p =>
        p.entity && p.username !== bot.username &&
        p.entity.position.distanceTo(bot.entity.position) <= 10
      );

      if (nearbyPlayers.length === 0) {
        bot.setQuickBarSlot(0);
        bot.activateItem(); // Simulate right-click
      }

      clickInterval = setTimeout(clickLoop, 250);
    };

    roam();
    clickLoop();
  }
}

createBot();
