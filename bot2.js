const mineflayer = require('mineflayer');
const { setTimeout } = require('timers');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.once('spawn', async () => {
    console.log('✅ Logged in, locking view');

    bot.chat('/login 3043AA');
    await bot.waitForTicks(20); // Wait 1s

    bot.activateItem(); // Right-click held item to open menu
    console.log('🖱️ Right-clicked item to open menu');

    bot.once('windowOpen', async (window) => {
      console.log('📦 Window opened');

      await bot.waitForTicks(30); // Wait for slots to load

      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1); // Shift-click
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 21 is empty or not loaded');
      }

      setTimeout(async () => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');

        // Wait 8s and start everything
        setTimeout(async () => {
          await bot.waitForChunksToLoad();
          console.log('✅ Chunks loaded, starting farming');

          // Lock current yaw/pitch
          const yaw = bot.entity.yaw;
          const pitch = bot.entity.pitch;
          await bot.look(yaw, pitch, true);
          console.log('🎯 View locked');

          bot.setControlState('forward', true);
          startStrafing(bot);
          breakBlocksConstantly(bot);
        }, 8000);
      }, 2000);
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

// Break a 3x2 wall in front of the bot every tick
function breakBlocksConstantly(bot) {
  bot.on('physicsTick', () => {
    const origin = bot.entity.position.offset(0, 0, 1); // 1 block in front

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        const target = origin.offset(dx, dy, 0); // 3x2 pattern
        const block = bot.blockAt(target);

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

// Alternate strafing every 45s
function startStrafing(bot) {
  let strafeLeft = true;

  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000);
}

// Start bot
createBot();
