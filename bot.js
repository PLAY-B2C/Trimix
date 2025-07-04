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
    reconnect();
  });

  bot.on('end', () => {
    console.log('❌ Disconnected. Reconnecting in 5s...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
}

createBot();

function getInventoryDiff(before, after) {
  const beforeMap = new Map(before.map(i => [i.name, i.count]));
  const result = [];

  for (const item of after) {
    const prev = beforeMap.get(item.name) || 0;
    if (item.count > prev) {
      result.push({ name: item.name, count: item.count - prev, nbt: item.nbt });
    }
  }

  return result;
}

function fishLoop(bot) {
  console.log('🎣 Casting rod...');
  const before = bot.inventory.items().map(item => ({ ...item }));
  bot.activateItem(); // Cast

  const checkInterval = setInterval(() => {
    const bobber = bot.entity?.fishingBobber;
    if (!bobber) return;

    let lastY = bobber.position.y;

    const track = setInterval(() => {
      const current = bot.entity?.fishingBobber;
      if (!current) {
        clearInterval(track);
        clearInterval(checkInterval);
        return;
      }

      const deltaY = lastY - current.position.y;
      lastY = current.position.y;

      if (deltaY > 0.1) { // Bobber dropped = bite
        console.log('🐟 Bite detected! Reeling in...');
        bot.deactivateItem(); // Reel in
        clearInterval(track);
        clearInterval(checkInterval);

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

          setTimeout(() => fishLoop(bot), 2000);
        }, 1500);
      }
    }, 100);
  }, 500);
}

function reconnect() {
  if (bot) {
    try {
      bot.quit();
    } catch (e) {}
  }
  setTimeout(createBot, 5000);
}
