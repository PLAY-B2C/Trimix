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

      setTimeout(openTeleportChest, 2000);
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
    bot.setQuickBarSlot(0); // Select first hotbar slot
    setTimeout(() => {
      bot.activateItem(); // Right-click with held item
      console.log(`🧤 Attempted chest interaction`);

      const windowOpenTimeout = setTimeout(() => {
        console.log('❌ Chest open timed out');
        startPostTeleportBehavior();
      }, 5000);

      bot.once('windowOpen', (window) => {
        clearTimeout(windowOpenTimeout);
        console.log(`📦 Chest opened (${window.slots.length} slots detected). Starting shift-click sequence...`);
        
        // Double chest has 54 slots - teleport item is at slot 20 (21st slot)
        const teleportSlot = 20; 
        const clickInterval = setInterval(() => {
          if (!bot.currentWindow) {
            console.log('✅ Window closed - teleport successful');
            clearInterval(clickInterval);
            startPostTeleportBehavior();
            return;
          }
          
          try {
            // Shift-click the teleport item
            bot.clickWindow(teleportSlot, 0, 1); 
            console.log(`👉 Shift-clicked slot ${teleportSlot + 1}`);
          } catch (err) {
            console.log(`⚠️ Click error: ${err.message}`);
            clearInterval(clickInterval);
            startPostTeleportBehavior();
          }
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
    console.log(`🎯 Locking view direction`);
    
    // Direction locking
    const lookLock = setInterval(() => {
      bot.look(bot.entity.yaw, bot.entity.pitch, false);
    }, 500);
    activeIntervals.push(lookLock);

    // Mining behavior
    holdLeftClickDig();
    
    // Movement pattern
    loopStrafe();
    
    // Inventory monitoring
    monitorInventoryFull();
  }, 10000);
}

function holdLeftClickDig() {
  const digInterval = setInterval(() => {
    const block = bot.blockAtCursor(4); // 4 block reach
    if (block && bot.canDigBlock(block) && !bot.targetDigBlock) {
      bot.dig(block)
        .catch(err => console.log(`⛏️ Dig error: ${err.message}`));
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
  }, 40000); // Switch direction every 40s
  activeIntervals.push(strafeInterval);
}

function monitorInventoryFull() {
  const invCheck = setInterval(() => {
    if (bot.inventory.emptySlotCount() === 0) {
      console.log("📦 Inventory full!");
      // Add inventory full handling here
    }
  }, 5000);
  activeIntervals.push(invCheck);
}

// Start the bot
startBot();
