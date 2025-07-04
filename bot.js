const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;
let fishingInterval = null;
let positionInterval = null;

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
    
    // Teleport to AFK spot immediately after spawn
    bot.chat('/tp IamChatGPT ' + AFK_SPOT.x + ' ' + AFK_SPOT.y + ' ' + AFK_SPOT.z + ' ' + 
              (FISHING_ANGLE.yaw * 180 / Math.PI) + ' ' + (FISHING_ANGLE.pitch * 180 / Math.PI));
    
    setTimeout(() => {
      bot.chat('/login 3043AA');
      startFishing();
    }, 3000);
  });

  bot.on('kicked', reason => {
    console.log('❌ Kicked:', reason);
    scheduleReconnect();
  });

  bot.on('end', () => {
    console.log('❌ Disconnected.');
    scheduleReconnect();
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
    scheduleReconnect();
  });
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
    if (fishingInterval) clearInterval(fishingInterval);
    if (positionInterval) clearInterval(positionInterval);

    // Force position and look angle constantly
    positionInterval = setInterval(() => {
      // Force position and look angle
      bot.look(FISHING_ANGLE.yaw, FISHING_ANGLE.pitch, true);
      
      // Teleport to AFK spot if moved
      const pos = bot.entity.position;
      if (Math.abs(pos.x - AFK_SPOT.x) > 0.1 || 
          Math.abs(pos.y - AFK_SPOT.y) > 0.1 || 
          Math.abs(pos.z - AFK_SPOT.z) > 0.1) {
        bot.chat('/tp IamChatGPT ' + AFK_SPOT.x + ' ' + AFK_SPOT.y + ' ' + AFK_SPOT.z + ' ' + 
                 (FISHING_ANGLE.yaw * 180 / Math.PI) + ' ' + (FISHING_ANGLE.pitch * 180 / Math.PI));
      }
    }, 100);  // Run every 100ms

    // Handle fishing rod casting/reeling
    fishingInterval = setInterval(() => {
      bot.activateItem(); // Right-click to cast/reel
    }, 300);

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
