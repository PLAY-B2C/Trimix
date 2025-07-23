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

      bot.once('windowOpen', (window) => {
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

    // 🔒 Lock current yaw/pitch
    const yaw = bot.entity.yaw;
    const pitch = bot.entity.pitch;
    setInterval(() => {
      bot.look(yaw, pitch, false); // prevent camera movement
    }, 500);

    holdLeftClickDig();
    loopStrafe();
    monitorInventoryFull();
  }, 10000);
}

function holdLeftClickDig() {
  setInterval(() => {
    const block = bot.blockAtCursor(5);
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
  let movingLeft = true;

  function strafe() {
    bot.setControlState('left', movingLeft);
    bot.setControlState('right', !movingLeft);

    console.log(`🚶 Strafing ${movingLeft ? 'left' : 'right'} for 40s...`);

    setTimeout(() => {
      bot.setControlState('left', false);
      bot.setControlState('right', false);
      movingLeft = !movingLeft;
      strafe();
    }, 40000); // 40 seconds
  }

  strafe();
}

function monitorInventoryFull() {
  setInterval(() => {
    const emptySlots = bot.inventory.emptySlotCount();
    if (emptySlots === 0) {
      console.log("📦 Inventory full!");
    }
  }, 5000);
}

startBot();
