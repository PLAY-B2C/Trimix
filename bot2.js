const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
};

let bot;
let activeIntervals = [];

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', () => {
    console.log(`✅ ${config.username} spawned.`);

    // Login sequence
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Sent login command`);

      // Spam /warp is twice with 2s gap
      let warpCount = 0;
      const warpInterval = setInterval(() => {
        if (warpCount >= 2) return clearInterval(warpInterval);
        bot.chat(`/warp is`);
        console.log(`💬 Sent: /warp is`);
        warpCount++;
      }, 2000);

      // Try opening chest after login
      setTimeout(openTeleportChest, 5000);
    }, 1000);
  });

  bot.on('error', err => {
    console.log(`❌ Bot error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`🔁 Disconnected. Reconnecting in 10s...`);
    clearActiveIntervals();
    setTimeout(startBot, 10000);
  });
}

function clearActiveIntervals() {
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];
}

function openTeleportChest() {
  try {
    bot.setQuickBarSlot(0);
    setTimeout(() => {
      bot.activateItem();
      console.log(`🧤 Attempted chest interaction`);

      const windowOpenTimeout = setTimeout(() => {
        console.log('❌ Chest open timed out');
        startPostTeleportBehavior();
      }, 5000);

      bot.once('windowOpen', (window) => {
        clearTimeout(windowOpenTimeout);
        console.log(`📦 Chest opened (${window.slots.length} slots). Shift-clicking...`);
        
        const teleportSlot = 20;
        let clickCount = 0;
        const maxClicks = 10;
        
        const clickInterval = setInterval(() => {
          if (clickCount >= maxClicks || !bot.currentWindow) {
            clearInterval(clickInterval);
            if (!bot.currentWindow) console.log('✅ Window closed - teleport likely successful');
            startPostTeleportBehavior();
            return;
          }
          
          clickCount++;
          
          bot.clickWindow(teleportSlot, 0, 1)
            .then(() => {
              console.log(`👉 Shift-clicked slot ${teleportSlot + 1} (${clickCount}/${maxClicks})`);
            })
            .catch(err => {
              if (err.message.includes("didn't respond to transaction")) {
                console.log('⚠️ Server ignored click (window likely closed)');
              } else {
                console.log(`❌ Click error: ${err.message}`);
              }
              clearInterval(clickInterval);
              startPostTeleportBehavior();
            });
        }, 300);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Chest interaction error:', err.message);
    startPostTeleportBehavior();
  }
}

function startPostTeleportBehavior() {
  console.log(`⏳ Starting post-teleport routine in 10s...`);
  setTimeout(() => {
    console.log(`🎯 Locking view direction once`);

    // Yaw -90°, pitch as-is
    const yaw = -Math.PI / 2;
    const pitch = bot.entity.pitch;
    bot.look(yaw, pitch, false);

    // Begin behaviors
    holdLeftClickDig();
    loopStrafe();
    monitorInventoryFull();
  }, 10000);
}

function holdLeftClickDig() {
  const digInterval = setInterval(() => {
    const block = bot.blockAtCursor(4);
    if (block && bot.canDigBlock(block) && !bot.targetDigBlock) {
      bot.dig(block)
        .then(() => {
          console.log(`✅ Dug: ${block.name}`);
        })
        .catch(err => {
          if (!err.message.includes('aborted')) {
            console.log(`⛏️ Dig error: ${err.message}`);
          }
        });
    }
  }, 100);
  activeIntervals.push(digInterval);
}

function loopStrafe() {
  let movingLeft = true;
  bot.setControlState('left', true);

  const strafeInterval = setInterval(() => {
    movingLeft = !movingLeft;
    bot.setControlState('left', movingLeft);
    bot.setControlState('right', !movingLeft);
    console.log(`🚶 Strafing ${movingLeft ? 'left' : 'right'}`);
  }, 40000); // every 40s
  activeIntervals.push(strafeInterval);
}

function monitorInventoryFull() {
  const invCheck = setInterval(() => {
    if (bot.inventory.emptySlotCount() === 0) {
      console.log("📦 Inventory full!");
    }
  }, 5000);
  activeIntervals.push(invCheck);
}

// Start the bot
startBot();
