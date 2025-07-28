const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let inLeechMode = false;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp crimson';
const botName = 'JamaaLcaliph';

const waypoints = [
  new Vec3(-360, 86, -591),
  new Vec3(-289, 84, -643),
  new Vec3(-262, 93, -630),
  new Vec3(-281, 101, -615)
];

const leechSpot = new Vec3(-256, 111, -562);
const lookTarget = new Vec3(-180, 111, -562);

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: botName,
    version: '1.16.5'
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
  });

  bot.once('windowOpen', async (window) => {
    console.log('📂 GUI opened');

    await bot.waitForTicks(40); // 2 seconds

    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      console.log(`🔹 Slot 20: ${slot.name}`);
      try {
        await bot.clickWindow(20, 0, 0); // left-click
        console.log('✅ Left-clicked slot 20');
      } catch (err) {
        console.log(`❌ Click error on slot 20: ${err.message}`);
      }
    } else {
      console.log('❌ Slot 20 is empty or not found');
    }

    setTimeout(() => {
      bot.chat(warpCommand);
      console.log('🔥 Warped to crimson');
      setTimeout(() => {
        startPatrol(bot);
      }, 8000);
    }, 2000);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    inLeechMode = false;
    console.log('☠️ Bot died. Restarting...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      console.log('🎯 Reached final waypoint. Switching to leech mode.');
      startLeechMode(bot);
      return;
    }

    const target = waypoints[patrolIndex];
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(interval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

function startLeechMode(bot) {
  inLeechMode = true;

  bot.pathfinder.setGoal(new goals.GoalNear(leechSpot.x, leechSpot.y, leechSpot.z, 1));
  console.log('📍 Moving to leech spot');

  const interval = setInterval(async () => {
    if (!inLeechMode) return clearInterval(interval);
    const dist = bot.entity.position.distanceTo(leechSpot);

    if (dist < 2) {
      try {
        await bot.lookAt(lookTarget, true);
        console.log('🎯 Looking at target');

        const rightClick = setInterval(() => {
          if (!inLeechMode) return clearInterval(rightClick);
          try {
            bot.setQuickBarSlot(0);
            bot.activateItem();
          } catch {}
        }, 300);

        setInterval(async () => {
          if (!inLeechMode) return;

          const offset = leechSpot.offset(1, 0, 0);
          console.log('🔄 Moving forward 1 block');
          bot.pathfinder.setGoal(new goals.GoalNear(offset.x, offset.y, offset.z, 1));
          await bot.waitForTicks(20);
          bot.pathfinder.setGoal(new goals.GoalNear(leechSpot.x, leechSpot.y, leechSpot.z, 1));
        }, 2 * 60 * 1000);
      } catch (err) {
        console.log('❌ Leech setup failed:', err.message);
      }

      clearInterval(interval);
    }
  }, 1000);
}

createBot();
