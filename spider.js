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
    console.log('✅ Logged in');

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
        bot.chat('/warp spider');
        console.log('💬 Sent /warp spider');

        // Wait 8 seconds for warp
        setTimeout(() => {
          goToAndSpam(bot);
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

// 🤖 Go to position and start spamming right-click
function goToAndSpam(bot) {
  const targetPos = { x: -331.5, y: 81, z: -228.5 };
  const lookAtPos = { x: -144.5, y: 81, z: -228.5 };

  // Look at horizontal target (same y to prevent vertical motion)
  bot.lookAt({ x: lookAtPos.x, y: bot.entity.position.y, z: lookAtPos.z }, true, () => {
    console.log('🎯 Locked look direction');

    // Move to position
    bot.pathfinder.setGoal(new mineflayer.pathfinder.goals.GoalBlock(
      targetPos.x, targetPos.y, targetPos.z
    ));

    const waitUntilArrival = setInterval(() => {
      const dist = bot.entity.position.distanceTo(targetPos);
      if (dist < 1) {
        clearInterval(waitUntilArrival);
        bot.clearControlStates();
        console.log('📍 Reached target location');

        // Select 1st hotbar slot
        bot.setQuickBarSlot(0);
        console.log('🎒 Holding item in hotbar slot 1');

        // Spam right-click every 300ms
        setInterval(() => {
          bot.activateItem();
        }, 300);
      }
    }, 500);
  });

  // Lock camera forever
  const yaw = bot.entity.yaw;
  const pitch = bot.entity.pitch;

  bot.on('move', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });

  bot.look = async () => {};
  bot.lookAt = async () => {};
}
  
// Load pathfinder plugin
const mineflayerPathfinder = require('mineflayer-pathfinder').pathfinder;
mineflayer.plugins = [mineflayerPathfinder];

// 🚀 Start bot
createBot();
