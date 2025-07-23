const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA',
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', () => {
    console.log('✅ Spawned');
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      setTimeout(openMenu, 2000);
    }, 1000);
  });

  bot.on('error', (err) => {
    console.log(`❌ Error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(startBot, 10000);
  });
}

function openMenu() {
  bot.setQuickBarSlot(0);

  setTimeout(() => {
    bot.activateItem(); // Right-click to open menu
    console.log('🧤 Right-clicked item');

    const fallback = setTimeout(() => {
      console.log('⚠️ Window not opened, continuing...');
      warpAndStart();
    }, 5000);

    bot.once('windowOpen', (window) => {
      clearTimeout(fallback);
      bot.clickWindow(20, 0, 1).then(() => {
        console.log('✅ Clicked slot 21');
        setTimeout(warpAndStart, 2000);
      }).catch((err) => {
        console.log(`❌ Click failed: ${err.message}`);
        warpAndStart();
      });
    });
  }, 1500);
}

function warpAndStart() {
  bot.chat('/warp is');
  setTimeout(() => {
    bot.chat('/warp is');
    console.log('💬 Sent /warp is x2');

    setTimeout(() => {
      console.log('🎯 Locking view & starting dig/strafe loop');
      lockViewOnce();
      holdLeftClickForever();
      startStrafeLoop();
    }, 8000);
  }, 2000);
}

function lockViewOnce() {
  const yaw = bot.entity.yaw;
  const pitch = bot.entity.pitch;

  bot.look(yaw, pitch, true); // Lock once and never change again
}

function holdLeftClickForever() {
  bot.setControlState('attack', true); // Absolute hold
}

function startStrafeLoop() {
  let strafeLeft = true;

  const loop = () => {
    bot.clearControlStates();
    bot.setControlState(strafeLeft ? 'left' : 'right', true);
    strafeLeft = !strafeLeft;
    setTimeout(loop, 40000); // Repeat every 40 sec
  };

  loop();
}

startBot();
