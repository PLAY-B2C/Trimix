const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

  const login = () => {
    setTimeout(() => {
      bot.chat('/login 3043AA');
    }, 3000);
  };

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    login();

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
          startFlowerPatrol(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('death', () => {
    console.log('💀 Bot died, respawning...');
    bot.once('spawn', () => {
      login();
      setTimeout(() => {
        bot.chat('/warp spider');
        setTimeout(() => {
          startFlowerPatrol(bot);
        }, 8000);
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

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startFlowerPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  const waypoints = [
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

  let index = 0;

  function findClosestWaypoint() {
    let closest = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < waypoints.length; i++) {
      const dist = bot.entity.position.distanceTo(waypoints[i]);
      if (dist < closestDistance) {
        closest = i;
        closestDistance = dist;
      }
    }
    return closest;
  }

  index = findClosestWaypoint();

  function moveToNext() {
    if (index >= waypoints.length) index = 0;

    const target = waypoints[index];
    console.log(`🚶 Moving to waypoint #${index + 1}: ${target}`);

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const startTime = Date.now();

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      const timePassed = Date.now() - startTime;

      if (dist < 2) {
        clearInterval(interval);
        index++;
        setTimeout(moveToNext, 200);
      } else if (timePassed > 10000) {
        console.log(`⚠️ Timeout reaching waypoint #${index + 1}, skipping.`);
        clearInterval(interval);
        index++;
        setTimeout(moveToNext, 200);
      }
    }, 300);
  }

  moveToNext();

  setInterval(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem();
  }, 300);
}

createBot();
