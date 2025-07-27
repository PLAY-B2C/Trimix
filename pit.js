const mineflayer = require('mineflayer');
const Vec3 = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

let lastAttackTime = Date.now();
let lastPosition = null;

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
            await bot.clickWindow(22, 0, 1);
            console.log('🖱️ Shift-clicked slot 22');
          } else {
            console.log('⚠️ Slot 22 is empty or not ready');
          }
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }

        setTimeout(() => {
          monitorAndAct();
          setInterval(checkStuck, 5000);
          setInterval(checkRespawnTimeout, 10000);
        }, 2000);
      });
    }, 1000);
  }, 2000);
});

function monitorAndAct() {
  setInterval(() => {
    const pos = bot.entity.position;

    // Run mode (Y >= 85): Go to 0, 84, 0
    if (pos.y >= 85) {
      bot.setControlState('forward', true);
      const targetVec = new Vec3(0, pos.y, 0);
      bot.lookAt(targetVec);
      bot.setControlState('jump', false);
      return;
    }

    // Attack mode (Y < 85)
    const target = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username);
    if (target && (bot.entity.onGround || bot.entity.velocity.y <= 0.01)) {
      bot.lookAt(target.position.offset(0, target.height, 0));
      bot.attack(target);
      console.log(`⚔️ Attacking player: ${target.username}`);
      lastAttackTime = Date.now();
    }

  }, 500);
}

function checkRespawnTimeout() {
  if (Date.now() - lastAttackTime > 60000) {
    console.log('⌛ No attack for 60s. Respawning...');
    bot.chat('/respawn');
    lastAttackTime = Date.now();
  }
}

function checkStuck() {
  const pos = bot.entity.position;
  if (lastPosition && pos.distanceTo(lastPosition) < 0.05) {
    console.log('⚠️ Bot seems stuck. Respawning...');
    bot.chat('/respawn');
  }
  lastPosition = pos.clone();
}

bot.on('death', () => {
  console.log('☠️ Died. Waiting to resume...');
  setTimeout(monitorAndAct, 3000);
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

bot.on('error', err => {
  console.log('❌ Error:', err.message);
});
