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
      bot.activateItem();
      bot.once('windowOpen', async (window) => {
        try {
          await bot.waitForTicks(40);
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
      });
    }, 1000);
  }, 2000);
});

bot.on('physicTick', () => {
  const y = bot.entity.position.y;

  if (y >= 85) {
    if (mode !== 'run') {
      console.log('🚶 Switched to run mode');
      mode = 'run';
    }
    runTo(new Vec3(0, 84, 0));
  } else {
    if (mode !== 'attack') {
      console.log('⚔️ Switched to attack mode');
      mode = 'attack';
    }

    const target = bot.nearestEntity(e => {
      return (
        e.type === 'player' &&
        e.username !== bot.username &&
        e.position.y - bot.entity.position.y <= 10 // Player must not be >10 blocks above
      );
    });

    if (target) {
      bot.lookAt(target.position.offset(0, target.height, 0), true);
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true);
      bot.setControlState('jump', true);
      bot.attack(target);
      lastAttackTime = Date.now();
      console.log(`⚔️ Attacking ${target.username}`);
    } else {
      bot.clearControlStates();
    }
  }
});

function runTo(pos) {
  const dir = pos.minus(bot.entity.position).normalize();
  const yaw = Math.atan2(-dir.x, -dir.z);
  bot.look(yaw, 0, true);

  bot.setControlState('forward', true);
  bot.setControlState('sprint', true);
  bot.setControlState('jump', true);
}

setInterval(() => {
  if (mode === 'attack' && Date.now() - lastAttackTime > 60000) {
    console.log('⌛ No attack for 1 min, typing /respawn');
    bot.chat('/respawn');
  }
}, 10000);

bot.on('death', () => {
  console.log('☠️ Bot died. Waiting to respawn...');
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

bot.on('error', err => console.log('❌ Error:', err.message));
