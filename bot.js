const mineflayer = require('mineflayer');

let bot;

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
      setTimeout(() => fishLoop(bot), 3000);
    }, 3000);
  });

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason);
    reconnectWithDelay();
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting...');
    reconnectWithDelay();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err);
  });
}

function reconnectWithDelay() {
  setTimeout(() => {
    console.log('🔁 Trying to reconnect...');
    createBot();
  }, 5000);
}

function fishLoop(bot) {
  console.log('🎣 Casting rod...');
  const before = bot.inventory.items().map(item => ({ ...item }));

  bot.activateItem(); // Cast rod

  const waitForBobber = setInterval(() => {
    const bobber = bot.entity?.fishingBobber;
    if (bobber) {
      clearInterval(waitForBobber);
      console.log('🧵 Bobber detected, waiting for splash...');

      bot.once('soundEffectHeard', async (sound) => {
        if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
          console.log('✅ Splash! Reeling in...');
          bot.deactivateItem();

          setTimeout(() => {
            const after = bot.inventory.items().map(item => ({ ...item }));
            const caught = getInventoryDiff(before, after);

            if (caught.length > 0) {
              caught.forEach(item => {
                if (
                  item.name === 'enchanted_book' &&
                  item.nbt?.value?.StoredEnchantments?.value?.value
                ) {
                  const enchList = item.nbt.value.StoredEnchantments.value.value.map(e =>
                    e.id.value.split(':')[1]
                  );
                  bot.chat(`📕 Caught: enchanted_book (${enchList.join(', ')})`);
                } else {
                  bot.chat(`🎣 Caught: ${item.name}${item.count > 1 ? ' x' + item.count : ''}`);
                }
              });
            } else {
              bot.chat('🎣 Nothing caught!');
            }

            fishLoop(bot); // Recast
          }, 1000);
        } else {
          console.log('⚠️ No splash detected. Resetting...');
          setTimeout(() => fishLoop(bot), 2000);
        }
      });
    }
  }, 300);
}

function getInventoryDiff(before, after) {
  const map = {};
  for (const item of before) {
    map[item.name] = (map[item.name] || 0) + item.count;
  }

  const changes = [];
  for (const item of after) {
    const prev = map[item.name] || 0;
    const diff = item.count - prev;
    if (diff > 0) {
      changes.push(item); // Return full item including NBT
    }
  }
  return changes;
}

createBot();
