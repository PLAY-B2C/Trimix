const mineflayer = require('mineflayer');

let bot;
let reconnectTimeout = null;
let rightClickInterval = null;

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
    setTimeout(() => {
      bot.chat('/login 3043AA');
      lockCameraAngle();
      startFishing();
    }, 3000);
  });

  bot.on('kicked', reason => {
    console.log('❌ Kicked:', reason);
    scheduleReconnect();
  });

  bot.on('end', () => {
    console.log('❌ Disconnected from server.');
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

function lockCameraAngle() {
  const yaw = 0 * (Math.PI / 180);
  const pitch = 16 * (Math.PI / 180);
  setInterval(() => {
    bot.look(yaw, pitch, true);
  }, 300); // constant lock every 300ms
}

async function startFishing() {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
  if (!rod) {
    bot.chat('❌ No fishing rod found in inventory!');
    return;
  }

  try {
    await bot.equip(rod, 'hand');
    bot.chat('🎣 Starting AFK fishing...');

    if (rightClickInterval) clearInterval(rightClickInterval);

    rightClickInterval = setInterval(() => {
      bot.activateItem(); // simulate right-click
    }, 300);

    bot.on('soundEffectHeard', async (sound) => {
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
