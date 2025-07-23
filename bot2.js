const mineflayer = require('mineflayer');
const { setTimeout } = require('timers');

let reconnecting = false;
let lockedYaw = null;
let lockedPitch = null;

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

      setTimeout(async () => {
        await bot.waitForChunksToLoad();
        console.log('✅ Chunks loaded, starting farming');

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

// Lock yaw and pitch forever
function preventViewMovement(bot, yaw, pitch) {
  bot.on('move', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });
}

// Break all 3x2 blocks in front of the bot
function breakBlocksConstantly(bot) {
  bot.on('physicsTick', () => {
    const basePos = bot.entity.position.offset(0, 0, 1); // Forward

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 0; dy++) {
        const targetPos = basePos.offset(dx, dy, 0);
        const block = bot.blockAt(targetPos);

        if (block && block.name !== 'air') {
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
      }
    }
  });
}

// Simple strafe loop
function startStrafing(bot) {
  let strafeLeft = true;
  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000);
}

createBot();
