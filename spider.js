const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      }

      setTimeout(() => {
        bot.chat('/warp spider');
        setTimeout(() => {
          setupMovement(bot);
          startPatrol(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message.startsWith('/goto ')) {
      const [x, y, z] = message.split(' ').slice(1).map(Number);
      goToCoords(bot, x, y, z);
    }
  });

  bot.on('death', () => {
    console.log('💀 Died! Respawning...');
    patrolIndex = findNearestWaypointIndex(bot);
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

function setupMovement(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.allowSprinting = true;
  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.walkSpeed = 0.1 * 3.45;
  movements.sprintSpeed = 0.3 * 3.45;
  movements.maxStepHeight = 2.5;

  bot.pathfinder.setMovements(movements);
}

const waypoints = [
  // Original waypoints
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

  // New circular patrol
  new Vec3(-300, 45, -273),
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
  new Vec3(-300, 45, -273)
];

function startPatrol(bot) {
  function goToNextWaypoint() {
    if (patrolIndex >= waypoints.length) patrolIndex = 0;
    const point = waypoints[patrolIndex];
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 3));

    const timeout = setInterval(() => {
      const dist = bot.entity.position.distanceTo(point);
      if (dist < 3) {
        clearInterval(timeout);
        patrolIndex++;
        setTimeout(goToNextWaypoint, 300);
      }
    }, 500);
  }

  goToNextWaypoint();

  // Auto-use flower item in slot 1 every 300ms
  setInterval(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem();
  }, 300);
}

function findNearestWaypointIndex(bot) {
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const dist = bot.entity.position.distanceTo(waypoints[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function goToCoords(bot, x, y, z) {
  console.log(`📍 Going to (${x}, ${y}, ${z})`);
  bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 2));
}

createBot();
