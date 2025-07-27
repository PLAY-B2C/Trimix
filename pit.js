const mineflayer = require('mineflayer');
const Vec3 = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

let lastAttackTime = Date.now();
let mode = 'run';

bot.once('spawn', () => {
  console.log('✅ Spawned');

  setTimeout(() => {
    bot.chat('/login ABCDEFG');

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem(); // right-click with item in hotbar slot 0

      bot.once('windowOpen', async (window) => {
        try {
          await bot.waitForTicks(40); // let GUI load
          const slot = window.slots[22];
          if (slot && slot.name !== 'air') {
            await bot.clickWindow(22, 0, 1); // shift-click
            console.log('🖱️ Shift-clicked slot 22');
          } else {
            console.log('⚠️ Slot 22 is empty or not ready');
          }
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }

        // Start behavior after GUI interaction
        startBehaviorLoop();
      });
    }, 1000);
  }, 2000);
});

function startBehaviorLoop() {
  setInterval(() => {
    const y = bot.entity.position.y;

    if (y >= 85) {
      if (mode !== 'run') {
        console.log('🚀 Switched to Run Mode');
        mode = 'run';
      }

      // Always run toward (0, 84, 0), even if blocks aren't present
      const direction = new Vec3(0, 84, 0).minus(bot.entity.position).normalize();
      bot.setControlState('sprint', true);
      bot.setControlState('jump', true);
      bot.look(direction.x, direction.z, false);
      bot.setControlState('forward', true);
    } else {
      if (mode !== 'attack') {
        console.log('⚔️ Switched to Attack Mode');
        mode = 'attack';
      }

      const target = bot.nearestEntity(e =>
        e.type === 'player' &&
        e.username !== bot.username &&
        !['YourAlt', 'Friend1'].includes(e.username)
      );

      if (target) {
        bot.lookAt(target.position.offset(0, target.height, 0), true);
        bot.attack(target);
        lastAttackTime = Date.now();
        console.log(`⚔️ Attacking ${target.username}`);
      }

      bot.setControlState('forward', false); // stop running
    }

    // Respawn if no one attacked for 1 minute
    if (Date.now() - lastAttackTime > 60 * 1000) {
      bot.chat('/respawn');
      lastAttackTime = Date.now(); // reset timer
    }
  }, 500);
}

bot.on('death', () => {
  console.log('☠️ Died. Resetting...');
  bot.setControlState('forward', false);
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

bot.on('error', err => {
  console.log('❌ Error:', err.message);
});
