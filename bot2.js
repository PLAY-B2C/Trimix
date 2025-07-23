const mineflayer = require('mineflayer');
const { setIntervalAsync } = require('set-interval-async');
let reconnecting = false;

function startBot() {
  const bot = mineflayer.createBot({
    host: 'javelin.aternos.host', // replace with your dyn IP
    port: 48918,
    username: 'IamChatGPT',
    version: '1.16.5',
  });

  bot.on('login', () => {
    console.log('✅ Logged in, locking view');
  });

  bot.on('spawn', () => {
    console.log('🎮 Spawned');

    setTimeout(() => {
      bot.activateItem(); // Right click to open menu
      console.log('🖱️ Right-clicked item to open menu');
    }, 1000);

    bot.once('windowOpen', (window) => {
      const slot = window.slots[20];
      if (!slot) return console.log('⚠️ Slot 21 empty or not loaded');

      setTimeout(async () => {
        try {
          await bot.clickWindow(20, 0, 1);
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.error('❌ Click failed:', err.message);
        }

        // Continue with warp after click
        setTimeout(() => {
          bot.chat('/warp is');
          bot.chat('/warp is');
          console.log('💬 Sent /warp is x2');

          setTimeout(() => {
            console.log('🎯 Locking view & starting dig/strafe loop');
            holdLeftClick(bot);
            startStrafing(bot);
          }, 8000);
        }, 2000);
      }, 1000);
    });
  });

  bot.on('end', () => {
    if (!reconnecting) {
      reconnecting = true;
      console.log('🔌 Disconnected. Reconnecting in 10s...');
      setTimeout(() => {
        reconnecting = false;
        startBot();
      }, 10000);
    }
  });

  bot.on('error', (err) => {
    console.error('❌ Bot error:', err.message);
  });
}

// Hold down left click forever (absolute)
function holdLeftClick(bot) {
  try {
    bot.setControlState('swing', true); // 'swing' = left click (use in place of 'attack')
  } catch (e) {
    console.error('❌ Error holding left click:', e.message);
  }
}

// Strafing logic
function startStrafing(bot) {
  let strafeLeft = true;

  setIntervalAsync(() => {
    if (strafeLeft) {
      bot.setControlState('left', true);
      bot.setControlState('right', false);
    } else {
      bot.setControlState('right', true);
      bot.setControlState('left', false);
    }
    strafeLeft = !strafeLeft;
  }, 40000); // every 40s
}

startBot();
