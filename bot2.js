const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', async () => {
    console.log(`✅ ${config.username} spawned.`);

    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Logged in with /login ${config.password}`);
      setTimeout(openTeleportChest, 2000);
    }, 1000);
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} error:`, err);
  });

  bot.on('end', () => {
    console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
    setTimeout(startBot, 10000);
  });
}

function openTeleportChest() {
  try {
    bot.setQuickBarSlot(0);
    setTimeout(() => {
      bot.activateItem();
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Spamming shift-click on slot 21...`);
        const slotToClick = 20;
        let attempts = 1;
        let delay = 300;

        const interval = setInterval(async () => {
          if (attempts <= 0 || !bot.currentWindow) {
            clearInterval(interval);
            console.log(`✅ Finished clicking or window closed.`);
            startPostTeleportBehavior();
            return;
          }

          const slot = bot.currentWindow.slots[slotToClick];
          if (slot) {
            try {
              await bot.clickWindow(slotToClick, 0, 1);
              console.log(`👉 Shift-clicked slot 21`);
            } catch (err) {
              console.error(`⚠️ Failed to click slot 21:`, err.message);
            }
          } else {
            console.log(`❌ Slot 21 is empty or undefined.`);
          }

          attempts--;
        }, delay);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

function startPostTeleportBehavior() {
  console.log(`⏳ Waiting 10 seconds before starting post-teleport behavior...`);
  setTimeout(() => {
    console.log(`🎯 Maintaining current view direction`);
    holdLeftClick();
    loopStrafe();
  }, 10000);
}

function holdLeftClick() {
  setInterval(() => {
    const block = bot.blockAtCursor(5); // 5 block reach

    if (block && bot.canDigBlock(block) && !bot.targetDigBlock) {
      bot.dig(block)
        .then(() => {
          console.log(`🧱 Dug: ${block.name} at ${block.position}`);
        })
        .catch(err => {
          console.log(`❌ Dig error: ${err.message}`);
        });
    }
  }, 100);
}

function loopStrafe() {
  let left = true;

  function strafe() {
    bot.setControlState('left', left);
    bot.setControlState('right', !left);
    console.log(`🚶 Strafing ${left ? 'left' : 'right'} for 40s...`);

    setTimeout(() => {
      bot.setControlState('left', false);
      bot.setControlState('right', false);
      left = !left;
      strafe();
    }, 40000); // 40 seconds
  }

  strafe();
}

startBot();
