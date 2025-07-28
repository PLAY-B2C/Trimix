const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';
let enableNameTrigger = false;

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
  new Vec3(-299, 67, -284),
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

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    bot.chat(loginCommand);

    setTimeout(() => {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem();
        console.log('🟢 Activated item in slot 0');
      } catch (err) {
        console.log('❌ Activation failed:', err.message);
      }
    }, 1000);

    bot.once('windowOpen', async (window) => {
      console.log('📂 GUI opened');
      await bot.waitForTicks(20); // 1 second

      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1); // Shift-click
          console.log('✅ Shift-clicked slot 20');
        } catch (err) {
          console.log('❌ Shift-click error:', err.message);
        }
      } else {
        console.log('❌ Slot 20 is empty');
      }

      setTimeout(() => {
        bot.chat(warpCommand);
        console.log('🕸️ Warped to spider');
        setTimeout(() => {
          startPatrol(bot);
        }, 8000); // Wait 8s after warp
      }, 2000); // Wait 2s after click
    });

    startRightClickLoop(bot);
  });

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

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('chat', (username, message) => {
    if (
      enableNameTrigger &&
      username !== bot.username &&
      message.toLowerCase().includes(botName.toLowerCase())
    ) {
      console.log(`💬 Name mentioned by ${username}: "${message}" — Restarting...`);
      bot.quit(); // triggers reconnect
    }
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

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

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  enableNameTrigger = true;

  const waypoints =
    patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(11);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      console.log('🎯 Reached final patrol point — switching to roam & hunt mode');
      roamAndHunt(bot);
      return;
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

function roamAndHunt(bot) {
  console.log('🕷️ Patrol complete — entering free roam & spider hunt mode');

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  let roaming = true;

  function getNearestSpider() {
    let nearest = null;
    let minDist = Infinity;
    for (const id in bot.entities) {
      const e = bot.entities[id];
      if (e.name === 'spider') {
        const dist = bot.entity.position.distanceTo(e.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = e;
        }
      }
    }
    return nearest;
  }

  function roamRandomly() {
    if (!roaming) return;

    const pos = bot.entity.position;
    const dx = Math.floor(Math.random() * 100 - 50);
    const dz = Math.floor(Math.random() * 100 - 50);
    const target = pos.offset(dx, 0, dz);

    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 2));
    console.log(`🚶 Roaming to (${target.x}, ${target.y}, ${target.z})`);

    setTimeout(roamRandomly, 10000);
  }

  function followSpiderLoop() {
  const spider = getNearestSpider();
  const goal = bot.pathfinder.goal;

  if (!spider || spider.dead || spider.health <= 0) {
    if (!roaming) {
      console.log('🔄 Lost spider. Resuming roam.');
      roaming = true;
      roamRandomly();
    }
    return;
  }

  // New spider detected or switched
  if (
    !goal ||
    goal.mob !== spider ||
    bot.entity.position.distanceTo(spider.position) > 20
  ) {
    console.log(`🕷️ New spider target at ${spider.position}`);
    roaming = false;
    bot.pathfinder.setGoal(new goals.GoalFollow(spider, 1), true);
    bot.pathfinder.goal.mob = spider; // attach custom prop for tracking
  }
}

  roamRandomly();
  setInterval(followSpiderLoop, 2000);
}

createBot();
