const mineflayer = require('mineflayer');
const { setTimeout, setInterval } = require('timers');

let reconnecting = false;
let lockedYaw = 0;
let lockedPitch = 0;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.once('spawn', async () => {
    console.log('✅ Logged in, locking view');

    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);
    bot.activateItem();
    console.log('🖱️ Right-clicked item to open menu');

    bot.once('windowOpen', async (window) => {
      console.log('📦 Window opened');
      await bot.waitForTicks(30);

      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 21 is empty or not loaded');
      }

      // Warp after delay
      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');
      }, 2000);

      // Setup locked view + actions
      setTimeout(() => {
        lockedYaw = bot.entity.yaw;
        lockedPitch = bot.entity.pitch;
        console.log('🎯 Locked yaw/pitch:', lockedYaw, lockedPitch);

        preventViewMovement(bot, lockedYaw, lockedPitch);
        breakBlocksConstantly(bot);
        startStrafing(bot);
      }, 10000);
    });
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;

    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

// 🔒 Prevent any view movement forever
function preventViewMovement(bot, yaw, pitch) {
  bot.look = async () => {};   // disable looking
  bot.lookAt = async () => {};

  bot.on('move', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });

  bot.on('forcedMove', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });
}

// ⛏️ Constant block breaking without rotating
function breakBlocksConstantly(bot) {
  setInterval(() => {
    const block = bot.blockAtCursor();
    if (block) {
      bot.dig(block, true).catch(() => {}); // ignore errors
    }
  }, 500); // every 0.5s
}

// ↔️ Left/right strafe loop every 45s
function startStrafing(bot) {
  let strafeLeft = true;
  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000);
}

// 🚀 Start the bot
createBot();
}

// ↔️ Left/right strafe loop every 45s
function startStrafing(bot) {
  let strafeLeft = true;
  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000);
}

// 🚀 Start the bot
createBot();
