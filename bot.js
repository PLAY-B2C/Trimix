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

    const yaw = 0 * Math.PI / 180;
    const pitch = 16 * Math.PI / 180;

    if (rightClickInterval) clearInterval(rightClickInterval);

    // Set initial look direction
    bot.look(yaw, pitch, true);

    rightClickInterval = setInterval(() => {
      // Force look direction BEFORE right-click
      bot.look(yaw, pitch, true);
      bot.activateItem(); // right click
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
