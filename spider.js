const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const { GoalBlock } = goals;

let reconnecting = false;
let patrolIndex = 0;
const homeIndex = 12;
let rightClickInterval;

const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

const waypoints = [
  // Pre-patrol route (leading to patrol)
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
  new Vec3(-300, 45, -273), // Index 12: HOME
  // Patrol loop starts from here
  new Vec3(-291, 45, -278),
  new Vec3(-284, 44, -250),
  new Vec3(-271, 44, -238),
  new Vec3(-273, 44, -224),
  new Vec3(-292, 43, -228),
  new Vec3(-326, 44, -224),
  new Vec3(-336, 44, -236),
  new Vec3(-326, 42, -252),
  new Vec3(-313, 43, -234),
  new Vec3(-288, 44, -259),
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
    bot.activateItem(); // Open chest GUI

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20; // 21st slot = index 20
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
          startRightClickLoop(bot); // Start spamming right click
          startPatrol(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('death', () => {
    patrolIndex = homeIndex;
    console.log('☠️ Bot died. Restarting patrol from home...');
    setTimeout(() => {
      bot.chat(warpCommand);
      setTimeout(() => {
        startRightClickLoop(bot);
        startPatrol(bot);
      }, 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    clearInterval(rightClickInterval);
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
  if (rightClickInterval) clearInterval(rightClickInterval);
  rightClickInterval = setInterval(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem(); // Right click every 300ms
  }, 300);
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  function goToNextWaypoint() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = homeIndex;
      console.log('🔁 Patrol loop complete. Restarting from home...');
    }

    const target = waypoints[patrolIndex];
    console.log(`➡️ Going to waypoint ${patrolIndex}: ${target}`);
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    const timeout = setTimeout(() => {
      if (bot.entity.position.distanceTo(target) > 2) {
        console.log(`⚠️ Timeout at waypoint ${patrolIndex}, skipping...`);
      }
      patrolIndex++;
      goToNextWaypoint();
    }, 10000); // 10 sec timeout

    bot.once('goal_reached', () => {
      clearTimeout(timeout);
      patrolIndex++;
      goToNextWaypoint();
    });
  }

  goToNextWaypoint();
}

createBot();
