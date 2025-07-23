const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', () => {
    console.log(`✅ Spawned as ${bot.username}`);

    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Sent login`);
      setTimeout(openTeleportChest, 2000);
    }, 1000);
  });

  bot.on('error', err => {
    console.log(`❌ Error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`🔁 Disconnected. Reconnecting in 10s...`);
    setTimeout(startBot, 10000);
  });
}

function openTeleportChest() {
  bot.setQuickBarSlot(0);

  setTimeout(() => {
    bot.activateItem(); // Right-click to open menu
    console.log('🧤 Tried to open menu');

    const timeout = setTimeout(() => {
      console.log('⚠️ Menu timeout. Proceeding anyway...');
      postTeleportSteps();
    }, 5000);

    bot.once('windowOpen', (window) => {
      clearTimeout(timeout);
      console.log('📦 Menu opened');

      const slot = 20; // 21st slot (index starts from 0)
      bot.clickWindow(slot, 0, 1).then(() => {
        console.log(`👉 Shift-clicked slot ${slot + 1}`);
        setTimeout(postTeleportSteps, 2000);
      }).catch(err => {
        console.log(`❌ Click error: ${err.message}`);
        postTeleportSteps();
      });
    });
  }, 1500);
}

function postTeleportSteps() {
  bot.chat('/warp is');
  setTimeout(() => {
    bot.chat('/warp is');
    console.log('💬 Sent /warp is twice');

    setTimeout(() => {
      console.log('⛏️ Holding left click to dig');
      bot.setControlState('attack', true); // hold dig

      startStrafingLoop(); // begin strafing
    }, 8000);
  }, 2000);
}

function startStrafingLoop() {
  let strafeLeft = true;

  function strafe() {
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
    console.log(`🚶 Strafing ${strafeLeft ? 'left' : 'right'}`);

    strafeLeft = !strafeLeft;

    setTimeout(strafe, 40000); // 40 seconds
  }

  strafe();
}

startBot();
