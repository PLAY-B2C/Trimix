const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;

function startBotLogic() {
  bot.chat('/login 3043AA');

  setTimeout(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem();
    console.log('🖱️ Right-clicked with item in slot 0');

    setTimeout(() => {
      try {
        const window = bot.currentWindow;

        if (window) {
          bot.shiftClickWindow(20);
          console.log('✅ Shift-clicked slot 20 in open GUI');
        } else {
          console.log('⚠️ No GUI window — sending raw shift-click packet');

          bot._client.write('window_click', {
            windowId: 0,
            slot: 20,
            mouseButton: 1,
            action: 1,
            mode: 1,
            item: { present: false }, // ✅ FIXED: prevents crash
          });

          console.log('✅ Sent raw window_click packet');
        }
      } catch (e) {
        console.log('⚠️ Shift-click error:', e.message);
      }

      setTimeout(() => {
        bot.chat('/warp museum');
        console.log('🧭 Warped to museum');
      }, 2000);
    }, 400);
  }, 1000);
}

function createBot() {
  bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'B2C',
    version: '1.16.5',
  });

  bot.on('login', () => {
    console.log('✅ Logged in');
  });

  bot.once('spawn', () => {
    console.log('🎮 Bot spawned — starting logic');
    startBotLogic();
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected from server.');
    scheduleReconnect();
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  console.log('🔁 Reconnecting in 10 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 10000);
}

createBot();
