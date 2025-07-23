const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

const allWaypoints = [
  new Vec3(-233, 80, -244),
  new Vec3(-261, 86, -237),
  new Vec3(-281, 95, -233),
  new Vec3(-292, 95, -211),
  new Vec3(-315, 96, -191),
  new Vec3(-331, 81, -228),
  new Vec3(-347, 79, -236),
  new Vec3(-360, 72, -256),
  new Vec3(-357, 67, -270),
  new Vec3(-333, 60, -276),
  new Vec3(-322, 57, -280),
  new Vec3(-300, 45, -273), // index 11 — becomes patrol home
  new Vec3(-291, 45, -278),
  new Vec3(-284, 44, -250),
  new Vec3(-271, 44, -238),
  new Vec3(-273, 44, -224),
  new Vec3(-292, 43, -228),
  new Vec3(-326, 44, -224),
  new Vec3(-336, 44, -236),
  new Vec3(-326, 42, -252),
  new Vec3(-313, 43, -234),
  new Vec3(-288, 44, -259)
];

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    bot.chat(loginCommand);

    await bot.waitForTicks(20);
    bot.setQuickBarSlot(0);
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
          console.log('🎯 Shift-clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        setTimeout(() => {
          startPatrol(bot);
          startRightClickLoop(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('death', () => {
    patrolIndex = 0;
    patrolMode = 'initial';
    console.log('☠️ Bot died. Restarting full route...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startPatrol(bot);
        startRightClickLoop(bot);
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

function startRightClickLoop(bot) {
  setInterval(() => {
    if (!bot?.entity || bot.entity.health <= 0) return;

    const item = bot.inventory.slots[36]; // Slot 0
    if (!item) return;

    try {
      bot.setQuickBarSlot(0); // Ensure item is selected
      bot.activateItem();     // Right-click action
    } catch (err) {
      // Usually "cooldown" errors — can be ignored
    }
  }, 300);
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  const waypoints =
    patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(11); // From "home"

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = 0;
      if (patrolMode === 'initial') {
        patrolMode = 'loop';
        console.log('🔁 Switched to patrol loop.');
      } else {
        console.log('🔁 Patrol loop restart.');
      }
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
