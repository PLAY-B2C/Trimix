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
    bot.setQuickBarSlot(0); // Select slot 1
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Attempting shift-click on slot 82...`);

        const slotToClick = 82;
        const slot = window.slots[slotToClick];

        if (slot) {
          try {
            await bot.clickWindow(slotToClick, 0, 1); // shift-click
            console.log(`👉 Shift-clicked slot 82`);

            // Start post-teleport actions after 10 sec
            setTimeout(startPostTeleportBehavior, 10000);
          } catch (err) {
            console.error(`⚠️ Failed to click slot 82:`, err.message);
          }
        } else {
          console.log(`❌ Slot 82 is empty or undefined.`);
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

function startPostTeleportBehavior() {
  console.log(`🕹️ Starting post-teleport behavior...`);

  bot.setControlState('attack', true); // Hold left click

  // Save current yaw/pitch
  const { yaw, pitch } = bot.entity;

  // Lock view direction
  bot.look(yaw, pitch, true);

  // Start strafe loop: 26s left, 26s right
  function startStrafeLoop() {
    bot.setControlState('left', true);
    bot.setControlState('right', false);
    console.log(`⬅️ Strafing left...`);
    setTimeout(() => {
      bot.setControlState('left', false);
      bot.setControlState('right', true);
      console.log(`➡️ Strafing right...`);
      setTimeout(startStrafeLoop, 26000);
    }, 26000);
  }

  startStrafeLoop();
}

startBot();
