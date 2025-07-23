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

    // Login
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
    bot.setQuickBarSlot(0); // Select slot 1
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Spamming shift-click on slot 21...`);

        const slotToClick = 20;
        let attempts = 1;

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
              await bot.clickWindow(slotToClick, 0, 1); // shift-click
              console.log(`👉 Shift-clicked slot 21`);
            } catch (err) {
              console.error(`⚠️ Failed to click slot 21:`, err.message);
            }
          } else {
            console.log(`❌ Slot 21 is empty or undefined.`);
          }

          attempts--;
        }, 300);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

// ✅ Post-teleport behaviors
function startPostTeleportBehavior() {
  console.log(`⏳ Waiting 10 seconds before starting post-teleport behavior...`);
  setTimeout(() => {
    console.log(`🎯 Maintaining current view direction`);
    startLeftClickLoop();
    startAutoDigLoop(); // ✅ Dig melons directly in front
    loopStrafe();
  }, 10000);
}

// ✅ Simulate holding left click (swing animation)
function startLeftClickLoop() {
  setInterval(() => {
    bot.swingArm(); // Simulate left-click
  }, 500);
}

// ✅ Auto-dig melon blocks in front of bot’s crosshair
function startAutoDigLoop() {
  setInterval(() => {
    const block = bot.blockAtCursor(4); // 4-block range
    if (block && block.name.includes('melon')) {
      if (bot.canDigBlock(block)) {
        bot.dig(block)
          .then(() => {
            console.log(`🍉 Dug melon block in front`);
          })
          .catch(err => {
            console.log(`❌ Failed to dig melon: ${err.message}`);
          });
      }
    }
  }, 1500); // Every 1.5 seconds
}

// ✅ Strafe left/right forever (35s each)
function loopStrafe() {
  console.log(`🚶 Starting strafe loop...`);

  function strafe(direction, duration, callback) {
    bot.setControlState(direction, true);
    console.log(`↔️ Strafing ${direction} for ${duration / 1000}s`);

    setTimeout(() => {
      bot.setControlState(direction, false);
      callback();
    }, duration);
  }

  function strafeLoop() {
    strafe('left', 35000, () => {
      strafe('right', 35000, () => {
        strafeLoop(); // Repeat forever
      });
    });
  }

  strafeLoop();
}

startBot();
