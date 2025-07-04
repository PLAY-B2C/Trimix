const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;
let fishingInterval = null;
let lookInterval = null;

// Configuration
const AFK_SPOT = { x: -2768.5, y: 69, z: -342.5 };
const FISHING_ANGLE = { yaw: 0, pitch: 16 * Math.PI / 180 };

function createBot() {
  bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
    auth: 'offline',
    version: false
  });

  bot.on('spawn', () => {
    console.log('✅ Spawned in');
    
    // Immediately set position and angle
    bot.entity.position.set(AFK_SPOT.x, AFK_SPOT.y, AFK_SPOT.z);
    bot.look(FISHING_ANGLE.yaw, FISHING_ANGLE.pitch, true);
    
    setTimeout(() => {
      bot.chat('/login 3043AA');
      startFishing();
    }, 3000);
  });

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason);
    scheduleReconnect();
    clearIntervals();
  });

  bot.on('end', () => {
    console.log('❌ Disconnected.');
    scheduleReconnect();
    clearIntervals();
  });

  bot.on('error', (err) => {
    console.log('❌ Error:', err.message);
    scheduleReconnect();
    clearIntervals();
  });
}

function clearIntervals() {
  if (fishingInterval) clearInterval(fishingInterval);
  if (lookInterval) clearInterval(lookInterval);
  fishingInterval = null;
  lookInterval = null;
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  console.log('🔁 Reconnecting in 60 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 60000);
}

async function startFishing() {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
  if (!rod) {
    bot.chat('❌ No fishing rod found!');
    return;
  }

  try {
    await bot.equip(rod, 'hand');
    bot.chat('🎣 Starting AFK fishing...');

    // Clear existing intervals
    clearIntervals();

    // CONSTANTLY force look direction (every 50ms)
    lookInterval = setInterval(() => {
      bot.look(FISHING_ANGLE.yaw, FISHING_ANGLE.pitch, true);
      
      // Debug: Log current pitch in degrees
      const currentPitch = Math.round(bot.entity.pitch * 180 / Math.PI);
      if (currentPitch !== 16) {
        console.log(`⚠️ Pitch reset to ${currentPitch}°, forcing back to 16°`);
      }
    }, 50);

    // Fishing action at 300ms interval
    fishingInterval = setInterval(() => {
      try {
        bot.activateItem();
      } catch (err) {
        console.log('❌ Right-click error:', err.message);
      }
    }, 300);

    // Sound detection for caught fish
    bot.on('soundEffectHeard', (sound) => {
      if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
        const caught = bot.inventory.items().slice(-1)[0];
        if (caught) {
          bot.chat(`🎣 Caught: ${caught.name}`);
        }
      }
    });

  } catch (err) {
    bot.chat('❌ Fishing error: ' + err.message);
  }
}

createBot();
