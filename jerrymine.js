const mineflayer = require('mineflayer');
const Vec3 = require('vec3');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.once('spawn', async () => {
    console.log('✅ Spawned. Logging in...');
    bot.chat('/login 3043AA');

    // GUI 1: slot 0 → slot 20
    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 2000);

    bot.once('windowOpen', async (window1) => {
      await bot.waitForTicks(30);
      const slotIndex1 = 20;
      const slot1 = window1.slots[slotIndex1];
      if (slot1 && slot1.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex1, 0, 1);
          console.log('🎯 Shift-clicked slot 20 from GUI 1');
        } catch (err) {
          console.log('❌ GUI 1 click error:', err.message);
        }
      }

      // GUI 2: slot 8 → slot 38
      setTimeout(() => {
        bot.setQuickBarSlot(8);
        bot.activateItem();
      }, 1000);

      bot.once('windowOpen', async (window2) => {
        await bot.waitForTicks(20);
        const slotIndex2 = 38;
        const slot2 = window2.slots[slotIndex2];
        if (slot2 && slot2.name !== 'air') {
          try {
            await bot.clickWindow(slotIndex2, 0, 1);
            console.log('🎯 Shift-clicked slot 38 from GUI 2');
          } catch (err) {
            console.log('❌ GUI 2 click error:', err.message);
          }
        }

        setTimeout(() => {
          goToIceArea(bot);
        }, 2000);
      });
    });
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Respawning...');
    setTimeout(() => {
      goToIceArea(bot);
    }, 3000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function goToIceArea(bot) {
  const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
  const mcData = require('minecraft-data')(bot.version);

  bot.loadPlugin(pathfinder);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;

  bot.pathfinder.setMovements(movements);
  const goal = new goals.GoalBlock(40, 76, 55);
  bot.pathfinder.setGoal(goal);

  const checkArrival = setInterval(() => {
    const dist = bot.entity.position.distanceTo(new Vec3(40, 76, 55));
    if (dist < 2) {
      clearInterval(checkArrival);
      console.log('✅ Arrived at ice mining area');
      bot.setQuickBarSlot(2); // 3rd slot
      startScanForIce(bot);
    }
  }, 1000);
}

function startScanForIce(bot) {
  let scanning = false;

  async function rotateAndFindIce() {
    if (scanning) return;
    scanning = true;

    const maxYaw = Math.PI * 2;
    const step = Math.PI / 8;

    for (let yaw = 0; yaw < maxYaw; yaw += step) {
      try {
        await bot.look(yaw, 0, true); // flat pitch
      } catch {}
      await bot.waitForTicks(5);

      const iceBlock = bot.findBlock({
        matching: (block) =>
          block.name === 'ice' &&
          block.position.y <= bot.entity.position.y + 1, // ignore above-head ice
        maxDistance: 10,
      });

      if (iceBlock) {
        console.log('🧊 Found reachable ice at', iceBlock.position);
        goMineBlock(bot, iceBlock.position);
        scanning = false;
        return;
      }
    }

    console.log('🔄 No valid ice found, retrying in 3s...');
    scanning = false;
    setTimeout(rotateAndFindIce, 3000);
  }

  rotateAndFindIce();
}

function goMineBlock(bot, position) {
  const { goals } = require('mineflayer-pathfinder');
  bot.pathfinder.setGoal(new goals.GoalBlock(position.x, position.y, position.z));

  let lastPos = bot.entity.position.clone();
  let stuckTime = 0;

  const stuckCheck = setInterval(() => {
    const distMoved = bot.entity.position.distanceTo(lastPos);
    lastPos = bot.entity.position.clone();

    if (distMoved < 0.2) {
      stuckTime += 1;
    } else {
      stuckTime = 0;
    }

    if (stuckTime >= 5) {
      console.log('⚠️ Bot is stuck! Aborting and scanning again...');
      clearInterval(stuckCheck);
      bot.pathfinder.setGoal(null);
      startScanForIce(bot);
    }
  }, 1000);

  const checkReach = setInterval(() => {
    const dist = bot.entity.position.distanceTo(position);
    if (dist < 3) {
      clearInterval(checkReach);
      clearInterval(stuckCheck);

      const block = bot.blockAt(position);
      if (block && block.name === 'ice') {
        bot.dig(block, true)
          .then(() => {
            console.log('⛏️ Mined ice block.');
            startScanForIce(bot);
          })
          .catch((err) => {
            console.log('⚠️ Digging error:', err.message);
            startScanForIce(bot);
          });
      } else {
        console.log('❌ Block is gone or invalid.');
        startScanForIce(bot);
      }
    }
  }, 500);
}

createBot();
