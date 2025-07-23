const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const { setTimeout } = require('timers');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

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

        setTimeout(() => {
          goToAndSpam(bot);
        }, 8000); // Wait 8s after warp
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

// ➤ Move to location and spam right-click
function goToAndSpam(bot) {
  const targetPos = new Vec3(-331, 81, -228);
  const lookAtPos = new Vec3(-144.5, 81, -228.5);

  // Lock look direction
  bot.lookAt(new Vec3(lookAtPos.x, bot.entity.position.y, lookAtPos.z), true, () => {
    console.log('🎯 Locked look direction');

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new goals.GoalBlock(targetPos.x, targetPos.y, targetPos.z));

    const arrivalCheck = setInterval(() => {
      const dist = bot.entity.position.distanceTo(targetPos);
      if (dist < 1) {
        clearInterval(arrivalCheck);
        bot.clearControlStates();
        console.log('📍 Reached target location');

        bot.setQuickBarSlot(0);
        console.log('🎒 Holding item in hotbar slot 1');

        // Start spamming right-click
        setInterval(() => {
          bot.activateItem();
        }, 300);
      }
    }, 500);
  });

  // Lock yaw/pitch permanently
  const yaw = bot.entity.yaw;
  const pitch = bot.entity.pitch;

  bot.on('move', () => {
    bot.entity.yaw = yaw;
    bot.entity.pitch = pitch;
  });

  bot.look = async () => {};
  bot.lookAt = async () => {};
}

// 🚀 Start bot
createBot();
