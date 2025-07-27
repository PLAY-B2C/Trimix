const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

bot.once('spawn', () => {
  console.log('✅ Spawned');
  setTimeout(() => {
    bot.chat('/login ABCDEFG');
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
      bot.once('windowOpen', async (window) => {
        try {
          await bot.waitForTicks(20);
          const slot = window.slots[22];
          if (slot && slot.name !== 'air') {
            await bot.clickWindow(22, 0, 1); // shift-click
            console.log('🖱️ Shift-clicked slot 22');
          }
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
        setTimeout(() => {
          walkForward(5000);
          startCombat();
        }, 2000);
      });
    }, 1000);
  }, 2000);
});

bot.on('death', () => {
  console.log('☠️ Died. Walking forward and restarting combat...');
  walkForward(5000);
  setTimeout(startCombat, 5000);
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

function walkForward(duration = 5000) {
  bot.setControlState('forward', true);
  setTimeout(() => {
    bot.setControlState('forward', false);
  }, duration);
}

function startCombat() {
  setInterval(() => {
    const player = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username);
    if (player && bot.canSeeEntity(player)) {
      bot.lookAt(player.position.offset(0, player.height, 0));
      bot.attack(player);
      console.log(`⚔️ Attacking player: ${player.username}`);
    }
  }, 500);
}

bot.on('error', err => console.log('❌ Error:', err.message));
