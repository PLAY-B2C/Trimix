const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
  roamRadius: 15,
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55),
    new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -23),
    new Vec3(-53, 147, -12),
    new Vec3(-51, 137, 17),
    new Vec3(-28, 131, 31),
    new Vec3(-7, 128, 59),
    new Vec3(0, 128, 160)
  ]
};

let bot, patrolIndex = 0, roamTimer = null;
let reachedGlacite = false;
let clickSpamActive = false;

function createBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    setTimeout(() => {
      bot.chat(config.loginCommand);
      setTimeout(() => openTeleportGUI(), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Died. Restarting...');
    resetState();
    setTimeout(() => {
      bot.chat(config.warpCommand);
      setTimeout(startPatrol, 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected. Reconnecting...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', err => console.log('❌ Error:', err.message));
}

function openTeleportGUI() {
  bot.setQuickBarSlot(0);
  bot.activateItem();

  bot.once('windowOpen', async window => {
    await bot.waitForTicks(20);
    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 1);
        console.log('🎯 Clicked teleport item.');
      } catch (e) {
        console.log('❌ GUI click error:', e.message);
      }
    }
    setTimeout(() => {
      bot.chat(config.warpCommand);
      setTimeout(startPatrol, 8000);
    }, 2000);
  });
}

function startPatrol() {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxJumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  patrolIndex = 0;
  moveToNextWaypoint();
}

function moveToNextWaypoint() {
  if (patrolIndex >= config.waypoints.length) patrolIndex = config.waypoints.length - 1;

  const target = config.waypoints[patrolIndex];
  bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

  const checkInterval = setInterval(() => {
    const distXZ = Math.hypot(bot.entity.position.x - target.x, bot.entity.position.z - target.z);

    if (distXZ < 2) {
      clearInterval(checkInterval);
      console.log(`📍 Reached waypoint ${patrolIndex}`);

      if (patrolIndex === config.waypoints.length - 1) {
        console.log('🌟 Reached Glacite. Switching to roam mode...');
        reachedGlacite = true;
        startRoamMode();
      } else {
        patrolIndex++;
        setTimeout(moveToNextWaypoint, 600);
      }
    } else if (!bot.pathfinder.isMoving()) {
      console.log(`⚠️ Stuck at ${patrolIndex}, skipping...`);
      clearInterval(checkInterval);
      patrolIndex++;
      setTimeout(moveToNextWaypoint, 600);
    }
  }, 500);
}

function startRoamMode() {
  monitorChatReconnect(); // Start listening to chat only now
  monitorProximity();     // Start player distance checks
  roamRandomly();
  startClickSpamming();
}

function roamRandomly() {
  if (!reachedGlacite) return;

  const offsetX = Math.floor(Math.random() * config.roamRadius * 2) - config.roamRadius;
  const offsetZ = Math.floor(Math.random() * config.roamRadius * 2) - config.roamRadius;
  const target = config.glaciteCenter.offset(offsetX, 0, offsetZ);
  const y = bot.blockAt(target)?.position.y || config.glaciteCenter.y;

  bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));
  roamTimer = setTimeout(roamRandomly, 5000 + Math.random() * 3000);
}

function startClickSpamming() {
  clickSpamActive = true;

  const loop = () => {
    if (!clickSpamActive || !reachedGlacite) return;
    bot.setQuickBarSlot(0);
    bot.activateItem();
    setTimeout(loop, 200);
  };

  loop();
}

function monitorProximity() {
  setInterval(() => {
    if (!reachedGlacite) return;
    const players = Object.values(bot.players).filter(p => p.entity);
    const nearby = players.find(p => bot.entity.position.distanceTo(p.entity.position) < 10);

    if (nearby) {
      if (clickSpamActive) {
        console.log('🛑 Player nearby — stopping click spam.');
        clickSpamActive = false;
      }
    } else {
      if (!clickSpamActive) {
        console.log('✅ Area clear — resuming click spam.');
        clickSpamActive = true;
        startClickSpamming();
      }
    }
  }, 1000);
}

function monitorChatReconnect() {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message.toLowerCase().includes('drakontide')) {
      console.log('🔁 Mention detected in chat. Restarting bot...');
      bot.quit();
      setTimeout(createBot, 5000);
    }
  });
}

function resetState() {
  patrolIndex = 0;
  reachedGlacite = false;
  clickSpamActive = false;
  clearTimeout(roamTimer);
}

createBot();
