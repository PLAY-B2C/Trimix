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
    new Vec3(-43, 135, 19),
    new Vec3(-7, 128, -59),
    new Vec3(0, 128, 160)
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;
let wanderTimer = null;
let combatTimer = null;
let rightClickTimer = null;
let idleBehaviorTimer = null;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version
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
    clearAllTimers();
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    clearAllTimers();
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });

  function clearAllTimers() {
    clearTimeout(wanderTimer);
    clearInterval(combatTimer);
    clearInterval(rightClickTimer);
    clearInterval(idleBehaviorTimer);
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
    movements.allowParkour = true;
    movements.canDig = false;
    movements.scafoldingBlocks = [];
    bot.pathfinder.setMovements(movements);

    function moveToNext() {
      if (patrolIndex >= botConfig.waypoints.length) {
        patrolIndex = botConfig.waypoints.length - 1;
      }

      const target = botConfig.waypoints[patrolIndex];
      bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));

      const interval = setInterval(() => {
        const dist = bot.entity.position.distanceTo(target);
        if (dist < 2) {
          clearInterval(interval);
          console.log(`📍 Reached waypoint ${patrolIndex}`);
          if (patrolIndex === botConfig.waypoints.length - 1) {
            reachedGlacite = true;
            console.log('🌟 Reached Glacite. Engaging...');
            startCombatLoop(bot);
            startRightClickLoop(bot);
            startIdleBehavior(bot);
            startIdleHeadMovement(bot); // NEW!
          } else {
            patrolIndex++;
            setTimeout(moveToNext, 600);
          }
        } else if (!bot.pathfinder.isMoving()) {
          console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
          clearInterval(interval);
          patrolIndex++;
          setTimeout(moveToNext, 600);
        }
      }, 400);
    }

    moveToNext();
  }

  function startRightClickLoop(bot) {
    rightClickTimer = setInterval(() => {
      if (reachedGlacite && bot.entity?.health > 0) {
        const target = bot.nearestEntity(e => e.type === 'mob' && e.name && e.type !== 'player');
        if (target) {
          try {
            bot.setQuickBarSlot(0);
            bot.activateItem(); // Right-click
          } catch (err) {
            console.log('⚠️ Right click failed:', err.message);
          }
        }
      }
    }, 300);
  }

  function startCombatLoop(bot) {
    combatTimer = setInterval(() => {
      if (!reachedGlacite || bot.entity?.health <= 0) return;

      const target = bot.nearestEntity(e => e.type === 'mob' && e.name && e.type !== 'player');

      if (target) {
        const offsetX = Math.floor(Math.random() * 30) - 15;
        const offsetZ = Math.floor(Math.random() * 30) - 15;
        const moveTo = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
        const y = bot.blockAt(moveTo)?.position.y || botConfig.glaciteCenter.y;
        bot.pathfinder.setGoal(new GoalNear(moveTo.x, y, moveTo.z, 1));

        lookAtSmooth(bot, target.position.offset(0, target.height, 0), 400);
        setTimeout(() => {
          if (bot.canSeeEntity(target)) {
            try {
              bot.setQuickBarSlot(0);
              bot.attack(target);
              bot.activateItem();
            } catch (err) {
              console.log('⚠️ Attack failed:', err.message);
            }
          }
        }, 450 + Math.random() * 200);
      }
    }, 800);
  }

  function startIdleBehavior(bot) {
    idleBehaviorTimer = setInterval(() => {
      if (!reachedGlacite || bot.entity?.health <= 0) return;

      const target = bot.nearestEntity(e => e.type === 'mob' && e.name && e.type !== 'player');
      if (!target) {
        bot.pathfinder.setGoal(null); // Stand still

        const rand = Math.random();
        if (rand < 0.6) {
          bot.setControlState('sneak', true);
          setTimeout(() => bot.setControlState('sneak', false), 400 + Math.random() * 600);
        } else if (rand < 0.75) {
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 300);
        }
      }
    }, 1500);
  }

  function startIdleHeadMovement(bot) {
    setInterval(() => {
      if (!reachedGlacite) return;
      const target = bot.nearestEntity(e => e.type === 'mob' && e.name && e.type !== 'player');
      if (!target && bot.entity?.health > 0) {
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
        const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.4;
        bot.look(yaw, pitch, false);
      }
    }, 1200);
  }

  async function lookAtSmooth(bot, targetPos, duration = 500) {
    const yawStart = bot.entity.yaw;
    const pitchStart = bot.entity.pitch;

    const dx = targetPos.x - bot.entity.position.x;
    const dy = targetPos.y - (bot.entity.position.y + bot.entity.height);
    const dz = targetPos.z - bot.entity.position.z;

    const yawEnd = Math.atan2(-dx, -dz);
    const dist = Math.sqrt(dx * dx + dz * dz);
    const pitchEnd = Math.atan2(dy, dist);

    const steps = Math.floor(duration / 50);
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const t = step / steps;

      const yaw = yawStart + (yawEnd - yawStart) * t;
      const pitch = pitchStart + (pitchEnd - pitchStart) * t;

      bot.look(yaw, pitch, false);

      if (step >= steps) clearInterval(interval);
    }, 50);
  }
}

createBot();
