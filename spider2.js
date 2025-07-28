const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const botName = 'JamaaLcaliph';
const loginCommand = '/login 3043AA';
const warpCommand = '/warp spider';

let reconnecting = false;
let patrolIndex = 0;
let patrolMode = 'initial';
let enableNameTrigger = false;

const allWaypoints = [
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
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Spawned');

    setTimeout(() => bot.chat(loginCommand), 500);

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 1500);

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
          console.log('🎯 Shift-clicked teleport item');
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
    console.log('☠️ Bot died. Re-running warp and patrol...');
    patrolIndex = 0;
    patrolMode = 'initial';
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
      console.log(`💬 Mentioned by ${username}: "${message}" — Restarting...`);
      bot.quit();
    }
  });

  bot.on('error', (err) => console.log('❌ Bot error:', err.message));
}

function startRightClickLoop(bot) {
  setInterval(() => {
    if (!bot.entity || bot.entity.health <= 0) return;
    try {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    } catch (err) {
      console.log('⚠️ Right click failed:', err.message);
    }
  }, 300);
}

function startPatrol(bot) {
  console.log('🚦 Starting patrol...');
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  enableNameTrigger = true; // 🔛 Enable name-trigger

  function goToNext() {
    if (patrolIndex >= allWaypoints.length) {
      console.log('🏁 Patrol done — entering spider hunting mode');
      roamAndHunt(bot);
      return;
    }

    const target = allWaypoints[patrolIndex];
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    const check = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(check);
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      } else if (!bot.pathfinder.isMoving()) {
        clearInterval(check);
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping`);
        patrolIndex++;
        setTimeout(goToNext, 200);
      }
    }, 500);
  }

  goToNext();
}

function roamAndHunt(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);
  movements.allowParkour = true;
  movements.canDig = false;

  function roam() {
    const pos = bot.entity.position;
    const dx = Math.floor(Math.random() * 80 - 40);
    const dz = Math.floor(Math.random() * 80 - 40);
    const target = pos.offset(dx, 0, dz);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 2));
    console.log(`🚶 Roaming to (${target.x}, ${target.y}, ${target.z})`);
  }

  function findNearestSpider() {
    let closest = null;
    let minDist = Infinity;
    for (const id in bot.entities) {
      const e = bot.entities[id];
      if (e.name === 'spider') {
        const d = bot.entity.position.distanceTo(e.position);
        if (d < minDist) {
          minDist = d;
          closest = e;
        }
      }
    }
    return closest;
  }

  function loop() {
    const spider = findNearestSpider();
    if (spider) {
      console.log(`🕷️ Chasing spider at ${spider.position}`);
      bot.pathfinder.setGoal(new goals.GoalFollow(spider, 1), true);
    } else {
      roam();
    }
  }

  roam();
  setInterval(loop, 3000);
}

createBot();
