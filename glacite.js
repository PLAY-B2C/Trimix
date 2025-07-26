const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
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

let patrolIndex = 0;
let reachedGlacite = false;
let wanderTimer = null;
let combatTimer = null;
let rightClickTimer = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
    keepAlive: true,
    connectTimeout: 60000
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned. Logging in...');
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Resetting...');
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
}

function openTeleportGUI(bot) {
  bot.setQuickBarSlot(0);
  bot.activateItem();

  bot.once('windowOpen', async window => {
    await bot.waitForTicks(20);
    const slot = window.slots[20];
    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 1);
        console.log('🎯 Clicked teleport item.');
      } catch (err) {
        console.log('❌ GUI click error:', err.message);
      }
    }

    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  // ✅ Apply Jump Boost IV logic
  movements.maxJumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canDig = false;
  movements.allow1by1towers = true;
  movements.scafoldingBlocks = [];

  bot.pathfinder.setMovements(movements);

  function moveToNext() {
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.waypoints.length - 1;
    }

    const target = botConfig.waypoints[patrolIndex];

    // 🚀 Force move regardless of air below (bot is immune to fall damage)
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

    const interval = setInterval(() => {
      const distXZ = Math.sqrt(
        Math.pow(bot.entity.position.x - target.x, 2) +
        Math.pow(bot.entity.position.z - target.z, 2)
      );

      if (distXZ < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          console.log('🌟 Reached Glacite. Engaging...');
          startRandomWander(bot);
          startRightClickLoop(bot);
          startCombatLoop(bot);
        } else {
          patrolIndex++;
          setTimeout(moveToNext, 600);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}. Skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(moveToNext, 600);
      }
    }, 500);
  }

  moveToNext();
}

function startRandomWander(bot) {
  if (wanderTimer) clearTimeout(wanderTimer);

  const wander = () => {
    if (!reachedGlacite) return;

    const mobsNearby = bot.nearestEntity(e =>
      e.type === 'mob' && e.name !== 'bat' && e.type !== 'player'
    );
    if (mobsNearby) return;

    const offsetX = Math.floor(Math.random() * 25) - 12;
    const offsetZ = Math.floor(Math.random() * 25) - 12;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;
    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));

    wanderTimer = setTimeout(wander, 5000 + Math.random() * 3000);
  };

  wander();
}

function startRightClickLoop(bot) {
  if (rightClickTimer) clearInterval(rightClickTimer);

  rightClickTimer = setInterval(() => {
    if (reachedGlacite && bot.entity?.health > 0) {
      const mobsNearby = bot.nearestEntity(e =>
        e.type === 'mob' && e.name !== 'bat' && e.type !== 'player'
      );
      if (mobsNearby) {
        try {
          bot.setQuickBarSlot(0);
          bot.activateItem();
        } catch (err) {
          console.log('⚠️ Right click failed:', err.message);
        }
      }
    }
  }, 300);
}

function startCombatLoop(bot) {
  if (combatTimer) clearInterval(combatTimer);

  combatTimer = setInterval(() => {
    if (!reachedGlacite || bot.entity?.health <= 0) return;

    const target = bot.nearestEntity(e =>
      e.type === 'mob' && e.name !== 'bat' && e.type !== 'player'
    );

    if (target) {
      if (wanderTimer) clearTimeout(wanderTimer);
      bot.pathfinder.setGoal(null);

      bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
        if (bot.canSeeEntity(target)) {
          try {
            bot.setQuickBarSlot(0);
            bot.attack(target);
            bot.activateItem();
          } catch (err) {
            console.log('⚠️ Attack failed:', err.message);
          }
        }
      });
    } else {
      bot.pathfinder.setGoal(null);
      startRandomWander(bot);
    }
  }, 400);
}

createBot();
