const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;
let patrolIndex = 0;
let enableNameTrigger = false;
let patrolMode = 'initial';

const loginCommand = '/login 3043AA';
const warpCommand = '/warp crimson';
const botName = 'JamaaLcaliph';

const allWaypoints = [
  new Vec3(-360, 86, -591),
  new Vec3(-289, 84, -643),
  new Vec3(-262, 93, -630),
  new Vec3(-281, 101, -615),
];

const leechSpot = new Vec3(-256, 111, -562);
const leechLook = new Vec3(-180, 111, -562);

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
  });

  bot.once('windowOpen', async (window) => {
    console.log('📂 GUI opened');

    await bot.waitForTicks(40); // wait 2 seconds for sync

    window.slots.forEach((slot, i) => {
      if (slot && slot.name !== 'air') {
        console.log(`🔹 Slot ${i}: ${slot.name}`);
      }
    });

    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 0); // regular left-click
        console.log('✅ Clicked slot 20 successfully');
      } catch (err) {
        console.log('❌ Click error on slot 20:', err.message);
      }
    } else {
      console.log('⚠️ Slot 20 is empty or not ready.');
    }

    setTimeout(() => {
      bot.chat(warpCommand);
      console.log('🔥 Warped to crimson');
      setTimeout(() => {
        startPatrol(bot);
      }, 8000);
    }, 2000);
  });

  bot.on('death', () => {
    patrolIndex = 0;
    patrolMode = 'initial';
    console.log('☠️ Bot died. Restarting patrol...');
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
      bot.quit();
    }
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });

  startRightClickLoop(bot);
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

  const waypoints = patrolMode === 'initial' ? allWaypoints : allWaypoints.slice(-1);

  function goToNext() {
    if (patrolIndex >= waypoints.length) {
      console.log('🎯 Reached last point — starting leech mode');
      startLeechMode(bot);
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

function startLeechMode(bot) {
  console.log('🧲 Entered leech mode');

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allowParkour = true;
  bot.pathfinder.setMovements(movements);

  let forward = false;

  function returnToLeechSpot() {
    bot.pathfinder.setGoal(new goals.GoalNear(leechSpot.x, leechSpot.y, leechSpot.z, 1));
    bot.lookAt(leechLook.offset(0, 0.5, 0));
    console.log('📍 Returning to leech spot');
  }

  async function moveOutAndBack() {
    forward = !forward;
    const offset = forward ? 1 : -1;
    const newPos = leechSpot.offset(offset, 0, 0);
    bot.pathfinder.setGoal(new goals.GoalNear(newPos.x, newPos.y, newPos.z, 1));
    console.log(`🚶 Moved ${forward ? 'forward' : 'back'}`);
    setTimeout(() => {
      returnToLeechSpot();
    }, 1000); // wait 1 second then return
  }

  returnToLeechSpot();
  setInterval(moveOutAndBack, 2 * 60 * 1000); // every 2 minutes
}

createBot();
