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

  bot.once('spawn', async () => {
    console.log('✅ Spawned');
    setTimeout(() => bot.chat(loginCommand), 1000);

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 2000);

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
        }, 8000);
      }, 2000);
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

  const waypoints = patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(11);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      console.log('🧭 Patrol complete — switching to roaming...');
      roamAndHunt(bot); // 🟢 Start roaming after last patrol
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
  console.log('🕷️ Patrol complete — entering free roam & spider hunt mode.');

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  let roaming = true;
  let currentTargetId = null;

  function getNearestSpider() {
    const spiders = bot.entities;
    let nearest = null;
    let minDist = Infinity;

    for (const id in spiders) {
      const entity = spiders[id];
      if (entity.name === 'spider') {
        const dist = bot.entity.position.distanceTo(entity.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = entity;
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

    console.log(`🚶 Roaming to (${target.x}, ${target.y}, ${target.z})`);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 2));

    setTimeout(() => roamRandomly(), 10000);
  }

  function followSpiderLoop() {
    const spider = getNearestSpider();

    if (spider && (!currentTargetId || spider.id !== currentTargetId)) {
      roaming = false;
      currentTargetId = spider.id;
      console.log(`🕷️ Switching to spider at (${spider.position})`);
      bot.pathfinder.setGoal(new goals.GoalFollow(spider, 1), true);
    } else if (!spider && !roaming) {
      roaming = true;
      currentTargetId = null;
      console.log('🔄 No spiders nearby. Resuming roam.');
      roamRandomly();
    }
  }

  roamRandomly();
  setInterval(followSpiderLoop, 2000);
}

createBot();
