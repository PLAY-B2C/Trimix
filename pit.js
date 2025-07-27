const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

bot.loadPlugin(pathfinder);

let combatEnabled = false;
let walkingHighY = false;
let forwardInterval = null;

bot.once('spawn', () => {
  console.log('✅ Spawned');

  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  defaultMove.allowSprinting = true;
  defaultMove.canDig = false;
  bot.pathfinder.setMovements(defaultMove);

  setTimeout(() => {
    bot.chat('/login ABCDEFG');
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
      bot.once('windowOpen', async (window) => {
        try {
          await bot.waitForTicks(40);
          const slot = window.slots[22];
          if (slot && slot.name !== 'air') {
            await bot.clickWindow(22, 0, 1);
            console.log('🖱️ Shift-clicked slot 22');
          } else {
            console.log('⚠️ Slot 22 is empty or not ready');
          }
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }

        setTimeout(() => {
          combatEnabled = true;
          startCombat();
        }, 2000);
      });
    }, 1000);
  }, 2000);
});

bot.on('death', () => {
  console.log('☠️ Died. Restarting logic...');
  combatEnabled = false;
  stopWalkingForward();
  setTimeout(() => {
    combatEnabled = true;
  }, 5000);
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

function startCombat() {
  setInterval(() => {
    const y = bot.entity.position.y;

    if (!combatEnabled) return;

    if (y >= 85) {
      if (!walkingHighY) {
        console.log(`🚫 Y=${y.toFixed(1)} ≥ 85. Walking forward...`);
        walkingHighY = true;
        startWalkingForward();
      }
      return;
    }

    // If Y < 85, stop forward walking
    if (walkingHighY) {
      console.log(`✅ Y=${y.toFixed(1)} < 85. Resuming combat.`);
      walkingHighY = false;
      stopWalkingForward();
    }

    const player = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username);
    if (player) {
      const dist = bot.entity.position.distanceTo(player.position);
      bot.lookAt(player.position.offset(0, player.height, 0));

      if (dist > 3) {
        bot.pathfinder.setGoal(new GoalNear(player.position.x, player.position.y, player.position.z, 1));
        console.log(`🏃 Chasing player: ${player.username} (dist: ${dist.toFixed(1)})`);
      } else {
        bot.pathfinder.setGoal(null);
        bot.attack(player);
        console.log(`⚔️ Attacking player: ${player.username}`);
      }
    } else {
      bot.pathfinder.setGoal(null);
    }
  }, 1000);
}

function startWalkingForward() {
  bot.setControlState('forward', true);
}

function stopWalkingForward() {
  bot.setControlState('forward', false);
}

bot.on('error', err => console.log('❌ Error:', err.message));
