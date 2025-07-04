const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;
let fishingInterval = null;

// Configuration - Set your AFK spot coordinates here
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
    
    // Immediately position and orient the bot
    bot.entity.position.set(AFK_SPOT.x, AFK_SPOT.y, AFK_SPOT.z);
    bot.look(FISHING_ANGLE.yaw, FISHING_ANGLE.pitch, true);
    
    setTimeout(() => {
      bot.chat('/login 3043AA');
      startFishing();
    }, 3000);
  });

  bot.on('kicked', reason => {
    console.log('❌ Kicked:', reason);
    scheduleReconnect();
    clearIntervals();
  });

  bot.on('end', () => {
    console.log('❌ Disconnected.');
    scheduleReconnect();
    clearIntervals();
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
    scheduleReconnect();
    clearIntervals();
  });
}

function clearIntervals() {
  if (fishingInterval) clearInterval(fishingInterval);
  fishingInterval = null;
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

    // Clear existing interval
    clearIntervals();

    // Create a combined interval for position and fishing
    fishingInterval = setInterval(() => {
      // Maintain position and look angle
      bot.entity.position.set(AFK_SPOT.x, AFK_SPOT.y, AFK_SPOT.z);
      bot.look(FISHING_ANGLE.yaw, FISHING_ANGLE.pitch, true);
      
      // Fishing action
      bot.activateItem();
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
