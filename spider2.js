const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';
const botName = 'JamaaLcaliph';

const allWaypoints = [
  new Vec3(-233, 80, -244),
  new Vec3(-233, 80, -244),
  new Vec3(-261, 86, -237),
  new Vec3(-281, 95, -233),
  new Vec3(-292, 95, -211),
  new Vec3(-315, 96, -191),
  new Vec3(-331, 81, -228),
  new Vec3(-302, 67, -273),
  new Vec3(-299, 67, -284), // index 11 — becomes patrol home
  new Vec3(-282, 65, -295),
  new Vec3(-258, 61, -273),
  new Vec3(-282, 65, -295),
];

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: botName,
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Spawned');

    // Step 1: Login
    setTimeout(() => bot.chat(loginCommand), 1000);

    // Step 2: Right-click item in slot 0
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 2000);

    // Step 3: GUI opens, shift-click index 20
    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1); // shift-click
          console.log('🎯 Shift-clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 20 is empty or missing.');
      }

      // Step 4: Warp → Wait → Patrol
      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => {
          startPatrol(bot);
        }, 8000);
      }, 2000);
    });

    startRightClickLoop(bot);
  });

  // Reconnect logic on death
  bot.on('death', () => {
    patrolIndex = 0;
    patrolMode = 'initial';
    console.log('☠️ Bot died. Restarting full route...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol(bot);
      }, 8000);
    }, 2000);
  });

  // Reconnect on disconnect
  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  // Reconnect if someone mentions the bot's name
  bot.on('chat', (username, message) => {
    if (username !== bot.username && message.toLowerCase().includes(botName.toLowerCase())) {
      console.log(`💬 Name mentioned by ${username}: "${message}" — Restarting...`);
      bot.quit(); // triggers reconnect
    }
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

// Right-click hotbar slot 0 item in loop
function startRightClickLoop(bot) {
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

// Patrol through waypoints
function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  const waypoints =
    patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(11);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = 0;
      patrolMode = 'loop';
      console.log('🔁 Restarting patrol from HOME');
    }

    const target = waypoints[patrolIndex];
    if (!target) return;

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const checkInterval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(checkInterval);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

createBot();
