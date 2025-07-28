const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';
let bot;

const allWaypoints = [
  new Vec3(-233, 80, -244),
  new Vec3(-233, 80, -244),
  new Vec3(-261, 86, -237),
  new Vec3(-281, 95, -233),
  new Vec3(-292, 95, -211),
  new Vec3(-315, 96, -191),
  new Vec3(-331, 81, -228),
  new Vec3(-302, 67, -273),
  new Vec3(-299, 67, -284),
  new Vec3(-282, 65, -295),
  new Vec3(-258, 61, -273),
  new Vec3(-282, 65, -295),
];

function createBot() {
  bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'JamaaLcaliph',
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    setTimeout(() => bot.chat(loginCommand), 2000);

    // Wait, then right-click item in hotbar slot 0
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 4000);

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1); // Shift-click
          console.log('🎯 Shift-clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => {
          startPatrol();
          startMentionListener();
        }, 8000);
      }, 2000);
    });

    startRightClickLoop();
  });

  bot.on('death', () => {
    patrolIndex = 0;
    patrolMode = 'initial';
    console.log('☠️ Bot died. Restarting full route...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol();
        startMentionListener();
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

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startRightClickLoop() {
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

function startMentionListener() {
  bot.on('chat', (username, message) => {
    if (!bot.username) return;
    if (message.toLowerCase().includes(bot.username.toLowerCase())) {
      console.log(`📣 Name mentioned by ${username}, restarting patrol...`);
      patrolIndex = 0;
      patrolMode = 'initial';
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol();
      }, 8000);
    }
  });
}

function startPatrol() {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  const waypoints = patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(8);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = 0;
      patrolMode = 'loop';
      console.log('🔁 Restarting patrol from HOME');
      return goToNext(); // 🟢 Ensure loop continues
    }

    const target = waypoints[patrolIndex];
    if (!target) return;

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    let started = false;
    const checkInterval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);

      if (dist < 2) {
        clearInterval(checkInterval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!started && bot.pathfinder.isMoving()) {
        started = true;
      } else if (started && !bot.pathfinder.isMoving()) {
        console.log(`⚠️ Possibly stuck at ${patrolIndex}, skipping...`);
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

createBot();
