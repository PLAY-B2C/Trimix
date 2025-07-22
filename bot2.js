const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.8.9',
});

bot.once('spawn', () => {
  console.log('✅ DrakonTide spawned.');
  bot.chat('/login 3043AA');

  setTimeout(() => {
    bot.setQuickBarSlot(0); // Hold item in slot 0
    bot.activateItem();     // Right-click to open chest GUI
    console.log('🧤 Right-clicked with held item to open GUI');
  }, 3000); // Wait 3s to ensure chunk loads
});

bot.on('windowOpen', (window) => {
  console.log('📦 Chest opened. Trying to pick item from slot 21...');

  setTimeout(() => {
    const item = window.slots[21];
    if (item) {
      bot.simpleClick.leftMouse(21)
        .then(() => {
          console.log(`✅ Clicked on ${item.name} in slot 21 to teleport`);
        })
        .catch(err => {
          console.error('❌ Failed to click item:', err);
        });
    } else {
      console.log('❌ Slot 21 is empty.');
    }
  }, 1000); // Delay to ensure inventory is fully loaded
});

bot.on('end', () => {
  console.log('🔌 Disconnected. Reconnecting in 10s...');
  setTimeout(() => bot.connect(), 10000);
});

bot.on('error', (err) => {
  console.error('❌ Bot Error:', err);
});
