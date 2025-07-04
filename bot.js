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
    console.log('✅ Spawned in');
    setTimeout(() => {
      bot.chat('/login 3043AA');
      begin(bot);
    }, 3000);
  });

  bot.on('kicked', () => {
    console.log('❌ Kicked. Reconnecting...');
    reconnect();
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected. Reconnecting...');
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

async function begin(bot) {
  try {
    const rod = bot.inventory.items().find(item => item.name.includes('fishing_rod'));

    if (!rod) {
      console.log('❌ No fishing rod found in inventory.');
      return;
    }

    console.log('🎣 Equipping fishing rod...');
    await bot.equip(rod, 'hand');
    fishLoop(bot);
  } catch (err) {
    console.log('❌ Error preparing fishing:', err);
  }
}

function fishLoop(bot) {
  console.log('🎣 Casting rod...');
  bot.activateItem(); // Cast

  bot.once('soundEffectHeard', (sound) => {
    if (!sound?.soundName) {
      console.log('⚠️ No soundName detected.');
      return setTimeout(() => fishLoop(bot), 2000);
    }

    console.log('🔊 Heard sound:', sound.soundName);

    if (sound.soundName.includes('entity.fishing_bobber.splash')) {
      console.log('✅ Splash detected! Reeling in...');
      bot.deactivateItem(); // Reel in
      setTimeout(() => {
        fishLoop(bot);
      }, 1000); // Wait then recast
    } else {
      console.log('↪️ Not a splash. Listening again...');
      fishLoop(bot);
    }
  });
}

createBot();
