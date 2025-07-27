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
          await bot.waitForTicks(40);
          const slot = window.slots[22];
          if (slot && slot.name !== 'air') {
            await bot.clickWindow(22, 0, 1); // Shift-click slot 22
            console.log('🖱️ Shift-clicked slot 22');

            // Start moving forward
            bot.setControlState('forward', true);
            console.log('🚶 Started moving forward');
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

bot.on('error', err => console.log('❌ Error:', err.message));
bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});
