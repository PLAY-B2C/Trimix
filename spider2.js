const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

const botConfig = {
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  waypoints: [
    new Vec3(-233, 80, -244),
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-281, 95, -233),
    new Vec3(-292, 95, -211),
    new Vec3(-315, 96, -191),
    new Vec3(-331, 81, -228),
    new Vec3(-302, 67, -273), // home (index 7)
    new Vec3(-299, 67, -284),
    new Vec3(-282, 65, -295),
    new Vec3(-258, 61, -273),
    new Vec3(-282, 65, -295),
  ]
};

let bot, patrolIndex = 0, homeReached = false, clickInterval = null;

function createBot() {
  bot = mineflayer.createBot({
    host: botConfig.host,
    port: botConfig.port,
    username: botConfig.username,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`${bot.username} spawned.`);
    startPatrol(bot);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (!homeReached) return; // only after home is reached

    const triggers = ['stop', 'pause', 'wait', 'start', 'go', 'resume'];
    if (!triggers.some(t => message.toLowerCase().includes(t))) return;

    if (message.toLowerCase().includes('stop') ||
        message.toLowerCase().includes('pause') ||
        message.toLowerCase().includes('wait')) {
      console.log('⏸️ Chat trigger: stopping clicks.');
      stopClicking();
    } else if (message.toLowerCase().includes('start') ||
               message.toLowerCase().includes('go') ||
               message.toLowerCase().includes('resume')) {
      console.log('▶️ Chat trigger: resuming clicks.');
      startClicking();
    }
  });

  bot.on('end', () => {
    console.log(`${bot.username} disconnected. Reconnecting in 5s...`);
    setTimeout(createBot, 5000);
  });

  bot.on('kicked', console.log);
  bot.on('error', console.log);
}

function startClicking() {
  if (clickInterval) return;
  clickInterval = setInterval(() => {
    bot.activateItem();
  }, 1000);
}

function stopClicking() {
  if (clickInterval) {
    clearInterval(clickInterval);
    clickInterval = null;
  }
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxDropDown = 10;
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  let retryCount = 0;
  const maxRetries = 3;

  function moveToNext() {
    // ✅ Reset to home (7) only after finishing all waypoints
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = 7;
    }

    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const distXZ = Math.hypot(
        bot.entity.position.x - target.x,
        bot.entity.position.z - target.z
      );

      if (distXZ < 2) {
        clearInterval(interval);
        retryCount = 0;
        console.log(`📍 Reached waypoint ${patrolIndex}`);

        if (patrolIndex === 7 && !homeReached) {
          console.log('🏠 Reached home waypoint. Enabling chat triggers + clicking...');
          homeReached = true;
          startClicking();
        }

        patrolIndex++;
        setTimeout(moveToNext, 600);

      } else if (!bot.pathfinder.isMoving()) {
        clearInterval(interval);
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`🔁 Retry ${retryCount}/${maxRetries} for waypoint ${patrolIndex}`);
          setTimeout(moveToNext, 800);
        } else {
          console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Skipping to next...`);
          patrolIndex++;
          retryCount = 0;
          setTimeout(moveToNext, 800);
        }
      }
    }, 500);
  }

  moveToNext();
}

createBot();
