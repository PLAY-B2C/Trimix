const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'DrakonTide',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');
    setTimeout(() => {
      goToIceMine(bot);
    }, 3000);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });
}

createBot();

function goToIceMine(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.canDig = false;
  movements.allowParkour = true;
  movements.jumpHeight = 2.5;
  movements.canJump = true;
  movements.allowFreeMotion = true;
  movements.allow1by1towers = false;

  bot.pathfinder.setMovements(movements);

  const waypoints = [new Vec3(1, 76, 58), new Vec3(40, 76, 55)];
  let current = 0;

  function nextWaypoint() {
    if (current >= waypoints.length) {
      console.log('📍 Arrived. Scanning ice...');
      scanAndMineIce(bot);
      return;
    }

    const target = waypoints[current++];
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    bot.once('goal_reached', () => {
      console.log(`✅ Reached waypoint: ${target}`);
      setTimeout(nextWaypoint, 300);
    });
  }

  nextWaypoint();
}

function scanAndMineIce(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const origin = bot.entity.position.floored();
  const range = 10;
  let nearest = null;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -range; dz <= range; dz++) {
        const pos = origin.offset(dx, dy, dz);
        const block = bot.blockAt(pos);
        if (!block || !block.name.includes('ice')) continue;
        if (pos.y > bot.entity.position.y + 1.5) continue;

        if (!nearest || bot.entity.position.distanceTo(pos) < bot.entity.position.distanceTo(nearest)) {
          nearest = pos;
        }
      }
    }
  }

  if (!nearest) {
    console.log('❌ No reachable ice nearby. Retrying...');
    setTimeout(() => scanAndMineIce(bot), 3000);
    return;
  }

  console.log('🎯 Found ice at', nearest);
  const goal = new GoalBlock(nearest.x, nearest.y, nearest.z);
  bot.pathfinder.setGoal(goal);

  let lastPos = bot.entity.position.clone();
  let stuckCount = 0;

  const stuckCheck = setInterval(() => {
    const moved = bot.entity.position.distanceTo(lastPos);
    lastPos = bot.entity.position.clone();

    if (moved < 0.2) stuckCount++;
    else stuckCount = 0;

    if (stuckCount >= 5) {
      console.log('⚠️ Stuck! Rescanning...');
      clearInterval(stuckCheck);
      bot.pathfinder.setGoal(null);
      setTimeout(() => scanAndMineIce(bot), 1000);
    }
  }, 1000);

  bot.once('goal_reached', async () => {
    clearInterval(stuckCheck);
    const block = bot.blockAt(nearest);
    if (block && block.name.includes('ice')) {
      await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));

      const pickaxe = bot.inventory.items().find(i => i.name.includes('pickaxe'));
      if (pickaxe) {
        try {
          await bot.equip(pickaxe, 'hand');
          console.log('🪓 Equipped pickaxe');
        } catch (err) {
          console.log('❌ Equip failed:', err.message);
        }
      } else {
        console.log('⚠️ No pickaxe found, mining with hand');
      }

      bot.swingArm('right', true);
      setTimeout(() => scanAndMineIce(bot), 3000);
    }
  });
}
