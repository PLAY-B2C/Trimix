const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { setTimeout } = require('timers');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  // ⬅️ FIX: Load plugin immediately
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
        }, 8000); // wait after warp
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

function goToAndSpam(bot) {
  const targetPos = new Vec3(-331, 81, -228);
  const lookAtPos = new Vec3(-144.5, bot.entity.position.y, -228.5);

  bot.lookAt(lookAtPos, true, () => {
    console.log(`🎯 Looking toward X:${lookAtPos.x.toFixed(1)} Z:${lookAtPos.z.toFixed(1)}`);

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);

    // ✅ Support Jump Boost 4
    movements.maxStepHeight = 2.5;
    movements.canDig = false;

    bot.pathfinder.setMovements(movements);

    const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 1);
    bot.pathfinder.setGoal(goal);

    const arrivalCheck = setInterval(() => {
      const pos = bot.entity.position;
      const dist = pos.distanceTo(targetPos);
      console.log(`📍 Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)} | ➡️ ${dist.toFixed(2)} away`);

      if (dist <= 1) {
        clearInterval(arrivalCheck);
        bot.clearControlStates();
        console.log('✅ Reached target position');

        bot.setQuickBarSlot(0);
        console.log('🎒 Holding item in slot 1');

        setInterval(() => {
          bot.activateItem();
        }, 300);
      }
    }, 1000);
  });

  // Lock yaw/pitch after looking
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
