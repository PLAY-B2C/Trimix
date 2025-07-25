const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.');
    bot.chat('/login 3043AA');

    setTimeout(() => {
      goToIceArea(bot);
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

function goToIceArea(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.jumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canJump = true;
  movements.allowFreeMotion = true;

  bot.pathfinder.setMovements(movements);

  const waypoints = [new Vec3(1, 76, 58), new Vec3(40, 76, 55)];
  let currentWaypoint = 0;

  function goNextWaypoint() {
    if (currentWaypoint >= waypoints.length) {
      console.log('📍 Reached mining area. Scanning for ice...');
      scanAndMineNearbyIce(bot);
      return;
    }

    const target = waypoints[currentWaypoint++];
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    bot.once('goal_reached', () => {
      console.log(`✅ Reached waypoint: ${target}`);
      setTimeout(goNextWaypoint, 300);
    });
  }

  goNextWaypoint();
}

function scanAndMineNearbyIce(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const range = 10;
  const origin = bot.entity.position.floored();

  let found = null;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -range; dz <= range; dz++) {
        const pos = origin.offset(dx, dy, dz);
        const block = bot.blockAt(pos);
        if (!block || !block.name.includes('ice')) continue;
        if (pos.y > bot.entity.position.y + 1.5) continue;

        const distance = bot.entity.position.distanceTo(pos);
        if (!found || distance < bot.entity.position.distanceTo(found)) {
          found = pos;
        }
      }
    }
  }

  if (!found) {
    console.log('❌ No reachable ice blocks nearby.');
    setTimeout(() => scanAndMineNearbyIce(bot), 3000);
    return;
  }

  console.log('🎯 Found ice at', found);
  const goal = new GoalBlock(found.x, found.y, found.z);
  bot.pathfinder.setGoal(goal);

  const startTime = Date.now();

  const stuckCheck = setInterval(() => {
    if (Date.now() - startTime > 5000) {
      console.log('⚠️ Stuck while reaching ice. Rescanning...');
      bot.pathfinder.setGoal(null);
      clearInterval(stuckCheck);
      scanAndMineNearbyIce(bot);
    }
  }, 1000);

  bot.once('goal_reached', async () => {
    clearInterval(stuckCheck);
    const block = bot.blockAt(found);
    if (block && block.name.includes('ice')) {
      await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));

      // Equip pickaxe if found
      const pickaxe = bot.inventory.items().find(i => i.name.includes('pickaxe'));
      if (pickaxe) {
        try {
          await bot.equip(pickaxe, 'hand');
          console.log('🪓 Equipped pickaxe.');
        } catch (err) {
          console.log('❌ Failed to equip pickaxe:', err.message);
        }
      } else {
        console.log('⚠️ No pickaxe in hotbar. Mining with hand.');
      }

      bot.swingArm('right', true);
      setTimeout(() => {
        scanAndMineNearbyIce(bot);
      }, 1500);
    } else {
      console.log('❌ Ice block disappeared or invalid.');
      scanAndMineNearbyIce(bot);
    }
  });
}
