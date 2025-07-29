const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
const loginCommand = '/login 3043AA';
const warpCommand = '/warp crimson';
const botName = 'JamaaLcaliph';

const waypoints = [
  new Vec3(-360, 86, -591),
  new Vec3(-289, 84, -643),
  new Vec3(-262, 93, -630),
  new Vec3(-281, 101, -615),
];

const leechSpot = new Vec3(-256, 111, -562);

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
      await bot.waitForTicks(20);
      const slot = window.slots[20];
      if (slot?.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 0);
          console.log('✅ Clicked slot 20');
        } catch (err) {
          console.log('❌ Click error on slot 20:', err.message);
        }
      } else {
        console.log('❌ Slot 20 is empty');
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        console.log('🔥 Warped to crimson');
        setTimeout(() => startPatrol(bot), 8000);
      }, 2000);
    });
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

  bot.on('error', err => {
    console.log('❌ Bot error:', err.message);
  });
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.canDig = false;
  movements.allowParkour = true;
  movements.allowFreeMotion = true;
  movements.jumpUpBlocks = 2;
  movements.canJump = true;
  movements.allowSprinting = true;

  bot.pathfinder.setMovements(movements);
  goToNextWaypoint(bot);
}

function goToNextWaypoint(bot) {
  if (patrolIndex >= waypoints.length) {
    console.log('🎯 Reached final point. Heading to leech spot...');
    return goToLeechSpot(bot);
  }

  const target = waypoints[patrolIndex];
  let attempts = 0;

  const tryNavigate = () => {
    if (attempts >= 3) {
      console.log(`⚠️ Failed to reach waypoint ${patrolIndex}, skipping...`);
      patrolIndex++;
      return goToNextWaypoint(bot);
    }

    console.log(`🚶 Going to waypoint ${patrolIndex}, attempt ${attempts + 1}`);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const check = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(check);
        patrolIndex++;
        setTimeout(() => goToNextWaypoint(bot), 500);
      } else if (!bot.pathfinder.isMoving()) {
        clearInterval(check);
        attempts++;
        setTimeout(tryNavigate, 500);
      }
    }, 800);
  };

  tryNavigate();
}

function goToLeechSpot(bot) {
  bot.pathfinder.setGoal(new goals.GoalNear(leechSpot.x, leechSpot.y, leechSpot.z, 1));

  const checkInterval = setInterval(() => {
    const dist = bot.entity.position.distanceTo(leechSpot);
    if (dist < 2) {
      clearInterval(checkInterval);
      startLeeching(bot);
    }
  }, 1000);
}

function startLeeching(bot) {
  console.log('🪱 Leeching mode started');
  let direction = 1;

  async function lookAndClick() {
    try {
      const yaw = -Math.PI; // North
      const pitch = -7 * (Math.PI / 180); // Pitch upward slightly
      await bot.look(yaw, pitch, true);
      bot.setQuickBarSlot(0);
      bot.activateItem();
    } catch (err) {
      console.log('⚠️ Leech look/click failed:', err.message);
    }
  }

  function stepForwardAndBack() {
    const offset = direction === 1 ? 1 : -1;
    direction *= -1;

    const target = bot.entity.position.offset(offset, 0, 0);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 0));

    setTimeout(() => {
      bot.pathfinder.setGoal(new goals.GoalNear(leechSpot.x, leechSpot.y, leechSpot.z, 0));
    }, 1000);
  }

  setInterval(lookAndClick, 300);
  setInterval(stepForwardAndBack, 2 * 60 * 1000); // Every 2 minutes
}

createBot();
