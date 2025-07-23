const mineflayer = require('mineflayer');
const { setTimeout } = require('timers');

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

      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');
      }, 2000);

      setTimeout(() => {
        // Lock yaw & pitch
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
  bot.on('move', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });

  bot.on('forcedMove', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });

  // Block camera control functions
  bot.look = async () => {};
  bot.lookAt = async () => {};
}

// ⛏️ Constant block breaking without rotating
function breakBlocksConstantly(bot) {
  bot.on('physicTick', () => {
    const block = bot.blockAtCursor(4);
    if (block) {
      bot._client.write('block_dig', {
        status: 0,
        location: block.position,
        face: 1,
      });
      bot._client.write('block_dig', {
        status: 2,
        location: block.position,
        face: 1,
      });
    }
  });
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
