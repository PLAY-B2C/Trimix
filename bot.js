const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;
let fishingInterval = null;
let lookInterval = null;

// Configuration
const AFK_SPOT = { x: -2768.5, y: 69, z: -342.5 };
const TARGET_PITCH = 16 * Math.PI / 180; // 16 degrees in radians
const BOAT_POSITION = { x: AFK_SPOT.x, y: AFK_SPOT.y, z: AFK_SPOT.z };

function createBot() {
  bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
    auth: 'offline',
    version: '1.21.4'
  });

  // Physics-based angle locking
  bot.on('physicsTick', () => {
    if (bot.entity) {
      bot.entity.pitch = TARGET_PITCH;
      bot.entity.yaw = 0;
    }
  });

  bot.on('spawn', async () => {
    console.log('✅ Spawned in');
    
    // Force initial position and angle
    bot.entity.position.set(AFK_SPOT.x, AFK_SPOT.y, AFK_SPOT.z);
    bot.look(0, TARGET_PITCH, true);
    
    // Boat locking implementation
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      bot.chat('/summon boat');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const boat = bot.nearestEntity(e => e.name === 'boat');
      
      if (boat) {
        await bot.ride(boat);
        console.log('🚤 Boat locked');
        
        // Position boat precisely
        boat.position.set(BOAT_POSITION.x, BOAT_POSITION.y, BOAT_POSITION.z);
      }
    } catch (err) {
      console.log('⚠️ Boat error:', err.message);
    }

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

    // Constant angle enforcement (every 50ms)
    lookInterval = setInterval(() => {
      bot.look(0, TARGET_PITCH, true);
    }, 50);

    // Fishing action with precise timing
    fishingInterval = setInterval(() => {
      try {
        // Casting sequence
        bot.activateItem();
        
        // Reeling sequence (1.5s later)
        setTimeout(() => {
          bot.activateItem();
        }, 1500);
      } catch (err) {
        console.log('❌ Fishing error:', err.message);
      }
    }, 3000); // Full cycle every 3 seconds

    // Sound detection for caught fish
    bot.on('soundEffectHeard', (sound) => {
      if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
        const caught = bot.inventory.items().find(item => 
          item.name.includes('fish') || 
          item.name.includes('treasure')
        );
        if (caught) {
          bot.chat(`🎣 Caught: ${caught.name} x${caught.count}`);
        }
      }
    });

    // Durability monitoring
    bot.on('heldItemChanged', (newItem, oldItem) => {
      if (newItem?.name.includes('fishing_rod') && newItem?.durability < 10) {
        bot.chat('⚠️ Fishing rod about to break!');
      }
    });

  } catch (err) {
    console.log('❌ Fishing setup error:', err.message);
  }
}

createBot();
