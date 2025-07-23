const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

// Full patrol waypoints
const waypoints = [
  new Vec3(-233, 80, -244),  // 0
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
  new Vec3(-300, 45, -273),  // 11 (Home)
  new Vec3(-291, 45, -278),  // 12 (Start patrol from here)
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

// Always right-click with hotbar slot 0 every 300ms
function startRightClickLoop(bot) {
  setInterval(() => {
    if (bot && bot.entity && bot.entity.health > 0) {
      bot.setQuickBarSlot(0);
      bot.swingArm('right'); // Simulate right-click (works better for spam)
    }
  }, 300);
}

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
          await bot.clickWindow(slotIndex, 0, 1); // Shift-click
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
    console.log('☠️ Bot died. Respawning and restarting patrol from waypoint 12');
    patrolIndex = 12;
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

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  if (patrolIndex < 12) patrolIndex = 12;

  function patrolNext() {
    if (patrolIndex >= waypoints.length) patrolIndex = 12;

    const target = waypoints[patrolIndex];
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const checkInterval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(patrolNext, 150);
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Skipping stuck waypoint ${patrolIndex}`);
        clearInterval(checkInterval);
        patrolIndex++;
        setTimeout(patrolNext, 150);
      }
    }, 500);
  }

  patrolNext();
}

createBot();
