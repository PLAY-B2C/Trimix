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
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55),
    new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -23),
    new Vec3(-53, 147, -12),
    new Vec3(-43, 135, 19),
    new Vec3(-7, 128, -59),
    new Vec3(0, 128, 160)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let bot;

function createBot() {
  bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
    keepAlive: true,
    connectTimeout: 60000
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Spawned');
    await bot.waitForTicks(40);
    bot.chat(botConfig.loginCommand);
    await bot.waitForTicks(40);
    bot.setQuickBarSlot(0);
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(20);
      if (window.slots[20]) {
        await bot.clickWindow(20, 0, 1); // Shift click
      }
      setTimeout(() => {
        bot.chat(botConfig.warpCommand);
        setTimeout(() => startPatrol(), 8000);
      }, 2000);
    });
  });

  bot.on('end', () => {
    console.log('🔁 Bot disconnected. Reconnecting...');
    setTimeout(createBot, 10000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    bot.chat(botConfig.warpCommand);
    setTimeout(() => startPatrol(), 8000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
}

function startPatrol() {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  const goToNext = () => {
    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));

    const interval = setInterval(() => {
      if (bot.entity.position.distanceTo(target) < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          startGlaciteBehavior();
        } else {
          patrolIndex++;
          setTimeout(goToNext, 600);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck. Skipping waypoint ${patrolIndex}`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(goToNext, 600);
      }
    }, 400);
  };

  goToNext();
}

function startGlaciteBehavior() {
  console.log('🌟 Reached Glacite Area');
  startRightClickLoop();
  startModeLoop();
  startPlayerReaction();
}

function startRightClickLoop() {
  setInterval(() => {
    if (reachedGlacite && bot.health > 0) {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem();
      } catch (err) {
        console.log('⚠️ Right-click failed:', err.message);
      }
    }
  }, 300);
}

function startModeLoop() {
  setInterval(() => {
    if (!reachedGlacite || bot.health <= 0) return;

    const mob = bot.nearestEntity(e => e.type === 'mob' && e.username == null);
    if (mob) {
      attackEntity(mob);
    } else {
      randomWander();
    }
  }, 700);
}

function attackEntity(entity) {
  try {
    bot.lookAt(entity.position.offset(0, entity.height, 0));
    bot.attack(entity);
  } catch (err) {
    console.log('⚠️ Attack failed:', err.message);
  }
}

function randomWander() {
  const dx = Math.floor(Math.random() * 25) - 12;
  const dz = Math.floor(Math.random() * 25) - 12;
  const pos = botConfig.glaciteCenter.offset(dx, 0, dz);
  const y = bot.blockAt(pos)?.position.y || botConfig.glaciteCenter.y;
  bot.pathfinder.setGoal(new GoalNear(pos.x, y, pos.z, 1));
}

function startPlayerReaction() {
  setInterval(() => {
    const player = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username);
    if (!player || Math.random() > 0.2) return;

    try {
      bot.lookAt(player.position.offset(0, 1.5, 0), true);
      const sneakTimes = Math.floor(Math.random() * 4) + 3;

      let count = 0;
      const interval = setInterval(() => {
        if (count >= sneakTimes) {
          bot.setControlState('sneak', false);
          clearInterval(interval);
        } else {
          bot.setControlState('sneak', true);
          setTimeout(() => bot.setControlState('sneak', false), 100);
          count++;
        }
      }, 150);
    } catch (err) {
      console.log('⚠️ Player sneak failed:', err.message);
    }
  }, 3000);
}

createBot();
