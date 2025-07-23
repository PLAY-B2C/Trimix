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
    bot.activateItem(); // Right-click to open GUI

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

  bot.on('death', () => {
    console.log('💀 Died. Restarting patrol from nearest waypoint.');
    setTimeout(() => {
      startFlowerPatrol(bot);
    }, 5000);
  });
}

function startFlowerPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxStepHeight = 2.5;
  movements.canDig = false;
  movements.allowSprinting = true;
  movements.allowParkour = true;
  movements.entityHunger = 0; // disables hunger logic
  movements.sprintSpeed = 0.345 * 0.1; // normalize for higher sprint speed

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
    new Vec3(-300, 45, -273),
  ];

  function moveToNext() {
    if (!bot || !bot.entity || !bot.entity.position) return;

    if (patrolIndex >= waypoints.length) patrolIndex = 0;

    const point = waypoints[patrolIndex];
    const chunkX = Math.floor(point.x) >> 4;
    const chunkZ = Math.floor(point.z) >> 4;

    if (!bot.world.isChunkLoaded(chunkX, chunkZ)) {
      console.log(`⏳ Chunk at [${chunkX}, ${chunkZ}] not loaded yet, retrying in 2s...`);
      setTimeout(moveToNext, 2000);
      return;
    }

    console.log(`➡️ Moving to [${patrolIndex}]: ${point.x} ${point.y} ${point.z}`);
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 1));

    const startTime = Date.now();

    const check = setInterval(() => {
      if (!bot || !bot.entity) {
        clearInterval(check);
        return;
      }

      const dist = bot.entity.position.distanceTo(point);

      if (dist < 2) {
        clearInterval(check);
        patrolIndex++;
        setTimeout(moveToNext, 300);
      }

      if (Date.now() - startTime > 10000) {
        console.log(`⏱️ Stuck or chunk not reachable. Re-trying...`);
        bot.pathfinder.setGoal(null);
        clearInterval(check);
        setTimeout(moveToNext, 1000);
      }
    }, 500);
  }

  moveToNext();

  setInterval(() => {
    bot.setQuickBarSlot(0); // Flower in slot 1
    bot.activateItem(); // Right click to shoot
  }, 300);
}

createBot();
