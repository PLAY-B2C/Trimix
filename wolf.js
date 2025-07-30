const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'B2C',
  version: '1.16.5',
});

bot.on('login', () => {
  console.log('Bot logged in');
});

bot.once('spawn', () => {
  bot.chat('/login 3043AA');

  setTimeout(() => {
    bot.setQuickBarSlot(0); // Set hotbar to slot 0

    const blockInFront = bot.blockAtCursor(4);
    if (!blockInFront) {
      console.log('No block in front to interact with.');
      return;
    }

    bot.activateBlock(blockInFront); // Right click
    console.log('Attempted to open chest');

    setTimeout(() => {
      const window = bot.currentWindow;
      if (!window) {
        console.log('No window opened');
        return;
      }

      const slot = window.slots[20];
      if (!slot) {
        console.log('Slot 20 is empty or undefined');
        return;
      }

      bot.shiftClickWindow(20);
      console.log('Shift-clicked slot 20');

      setTimeout(() => {
        bot.chat('/warp museum');
        console.log('Warped to museum');
      }, 2000);
    }, 400);
  }, 1000);
});

bot.on('error', err => console.log('Bot error:', err));
bot.on('end', () => console.log('Bot disconnected'));
