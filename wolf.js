const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder } = require('mineflayer-pathfinder');

let bot;
let reconnectTimeout = null;

const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp museum',
};

function createBot() {
  bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => openTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected from server.');
    scheduleReconnect();
  });

  bot.on('error', err => {
    console.log('❌ Bot error:', err.message);
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  console.log('🔁 Reconnecting in 10 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 10000);
}

function openTeleportGUI(bot) {
  bot.setQuickBarSlot(0);
  bot.activateItem();
  console.log('🖱️ Right-clicked with item in slot 0');

  bot.once('windowOpen', async window => {
    await bot.waitForTicks(20); // wait for GUI to fully load
    const slot = window.slots[20];
    if (slot) {
      try {
        await bot.clickWindow(20, 0, 1);
        console.log('✅ Shift-clicked slot 20');
      } catch (err) {
        console.log('❌ GUI click error:', err.message);
      }
    } else {
      console.log('⚠️ Slot 20 not found — skipping click');
    }

    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      console.log('🧭 Warped to museum');
    }, 2000);
  });

  // If no GUI opens, still warp after delay
  setTimeout(() => {
    if (!bot.currentWindow) {
      console.log('⚠️ No GUI opened — continuing anyway');
      bot.chat(botConfig.warpCommand);
      console.log('🧭 Warped to museum');
    }
  }, 3000);
}

createBot();
