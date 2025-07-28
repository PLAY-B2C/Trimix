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

  enableNameTrigger = true; // ✅ Activate name trigger only after warp

  const waypoints = patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(8);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      patrolIndex = 0;
      patrolMode = 'loop';
      console.log('🔁 Restarting patrol from HOME');
    }

    const target = waypoints[patrolIndex];
    if (!target) return;

    console.log(`➡️ Heading to waypoint ${patrolIndex}: ${target.toString()}`);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));

    let reached = false;

    const timeout = setTimeout(() => {
      if (!reached) {
        console.log(`⏱️ Timeout at waypoint ${patrolIndex}, skipping...`);
        bot.pathfinder.setGoal(null);
        patrolIndex++;
        goToNext();
      }
    }, 15000); // 15s timeout per waypoint

    const interval = setInterval(() => {
      if (!bot.entity?.position) return;

      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearTimeout(timeout);
        clearInterval(interval);
        reached = true;
        console.log(`✅ Reached waypoint ${patrolIndex}`);
        patrolIndex++;
        setTimeout(goToNext, 300);
      }
    }, 500);
  }

  goToNext();
}

createBot();
