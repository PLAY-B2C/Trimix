const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');
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

    // Wait 1s and open the menu
    await bot.waitForTicks(20);
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      console.log('📦 Window opened');
      await bot.waitForTicks(30); // Wait for items to load

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
        console.log('⚠️ Slot 21 empty or not loaded');
      }

      // Warp after short delay
      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');
      }, 2000);

      // After warp, lock view, start mining and strafing
      setTimeout(() => {
        console.log('⛏️ Starting break + strafe');
        lockView(bot);
        startStrafing(bot);
        breakThreeBlocks(bot);
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

function lockView(bot) {
  const yaw = bot.entity.yaw;
  const pitch = bot.entity.pitch;
  bot.look(yaw, pitch, true);
  bot.on('move', () => {
    bot.look(yaw, pitch, true);
  });
}

// Constantly mine 3 vertical blocks in front of crosshair
function breakThreeBlocks(bot) {
  setInterval(() => {
    const pos = bot.entity.position.offset(1, 0, 0).floored(); // Block in front
    for (let dy = 0; dy <= 2; dy++) {
      const target = bot.blockAt(pos.offset(0, dy, 0));
      if (target && bot.canDigBlock(target)) {
        bot.dig(target, true).catch(() => {});
      }
    }
  }, 100); // No delay between blocks
}

// Strafe left-right every 45s
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
