const mineflayer = require('mineflayer');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
    auth: 'offline',
    version: false
  });

  bot.once('spawn', async () => {
    console.log('✅ Spawned');
    setTimeout(() => {
      bot.chat('/login 3043AA');
      startFishing(bot);
    }, 3000);
  });

  bot.on('kicked', () => {
    console.log('❌ Kicked. Reconnecting in 5s...');
    reconnect();
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected. Reconnecting in 5s...');
    reconnect();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err.message);
  });
}

function reconnect() {
  setTimeout(() => {
    createBot();
  }, 5000);
}

async function startFishing(bot) {
  try {
    const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
    if (!rod) {
      bot.chat('❌ No fishing rod found.');
      return;
    }

    await bot.equip(rod, 'hand');
    fishCycle(bot);
  } catch (err) {
    console.log('❌ Equip error:', err);
  }
}

function fishCycle(bot) {
  bot.activateItem(); // cast rod
  bot.once('soundEffectHeard', (sound) => {
    if (sound && sound.soundName.includes('entity.fishing_bobber.splash')) {
      bot.deactivateItem(); // reel in
      setTimeout(() => {
        fishCycle(bot); // wait and recast
      }, 1000);
    } else {
      // wait again if wrong sound
      fishCycle(bot);
    }
  });
}

createBot();
