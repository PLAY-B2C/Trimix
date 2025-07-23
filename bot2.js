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

  bot.once('spawn', () => {
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
        let delay = 300;

        const interval = setInterval(async () => {
          if (attempts <= 0 || !bot.currentWindow) {
            clearInterval(interval);
            console.log(`✅ Finished clicking or window closed.`);
            startPostTeleportBehavior(); // Start behavior after teleport
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
    const block = bot.blockAtCursor(5); // Block bot is currently looking at

    if (block) {
      bot._client.write('block_dig', {
        status: 0, // START_DESTROY_BLOCK
        location: block.position,
        face: 1,
      });

      bot._client.write('block_dig', {
        status: 2, // STOP_DESTROY_BLOCK
        location: block.position,
        face: 1,
      });

      bot.swingArm(); // Visual arm swing
      console.log(`🧱 Breaking block: ${block.name}`);
    }
  }, 300); // Every 300ms
}

function loopStrafe() {
  let strafeLeft = true;

  function strafe() {
    if (strafeLeft) {
      bot.setControlState('left', true);
      bot.setControlState('right', false);
      console.log('⬅️ Strafing left');
    } else {
      bot.setControlState('left', false);
      bot.setControlState('right', true);
      console.log('➡️ Strafing right');
    }

    strafeLeft = !strafeLeft;
    setTimeout(strafe, 35000); // 35 seconds each side
  }

  strafe(); // Start loop
}

startBot();
