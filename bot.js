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
      startFishing(bot);
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

async function startFishing(bot) {
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
    console.log('❌ Error equipping rod:', err);
  }
}

function fishLoop(bot) {
  console.log('🎣 Casting rod...');
  bot.activateItem(); // Cast rod

  const waitForBobber = setInterval(() => {
    const bobber = bot.entity?.fishingBobber;
    if (bobber) {
      clearInterval(waitForBobber);
      console.log('🧵 Bobber in water. Listening for splash...');

      bot.once('soundEffectHeard', (sound) => {
        console.log('🔊 Heard sound:', sound?.soundName);

        if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
          console.log('✅ Splash! Reeling in...');
          bot.deactivateItem(); // Reel in
          setTimeout(() => fishLoop(bot), 1000); // Recast
        } else {
          console.log('⚠️ Not a splash. Restarting...');
          setTimeout(() => fishLoop(bot), 2000);
        }
      });
    }
  }, 200);
}

createBot();
