const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

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

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    console.log('✅ Spawned in');
    setTimeout(() => {
      bot.chat('/login 3043AA');
      aimAndFish();
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
    console.log('❌ Connection error:', err.message);
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

function aimAndFish() {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
  if (!rod) {
    bot.chat('❌ No fishing rod in inventory!');
    return;
  }

  bot.equip(rod, 'hand').then(async () => {
    bot.chat('/tp IamChatGPT -2769.5 69 -342.5');
    await bot.waitForTicks(20);

    // Look at correct angle
    const yaw = Math.PI * (90 / 180);
    const pitch = Math.PI * (16 / 180);
    bot.look(yaw, pitch, true);
    bot.setControlState('sneak', true);
    bot.chat('🎯 Aiming at fishing spot...');
    
    // Start 300ms right-click spam
    if (rightClickInterval) clearInterval(rightClickInterval);
    rightClickInterval = setInterval(() => {
      bot.activateItem(); // right-click
    }, 300);

    // Listen for splash to detect catch
    bot.on('soundEffectHeard', async (sound) => {
      if (sound && sound.soundName && sound.soundName.includes('entity.fishing_bobber.splash')) {
        const caught = bot.inventory.items().slice(-1)[0];
        if (caught) {
          bot.chat(`🎣 Caught: ${caught.name}`);
        }

        if (isInventoryFull()) {
          bot.chat('📦 Inventory full, dumping to chest...');
          await dumpToChest();
        }
      }
    });
  }).catch(err => {
    bot.chat('❌ Failed to equip rod: ' + err.message);
  });
}

function isInventoryFull() {
  return bot.inventory.emptySlotCount() === 0;
}

async function dumpToChest() {
  const chestBlock = bot.findBlock({
    matching: block => block.name === 'chest' || block.name === 'trapped_chest',
    maxDistance: 6
  });

  if (!chestBlock) {
    bot.chat('❌ No chest found to dump items.');
    return;
  }

  try {
    const chest = await bot.openContainer(chestBlock);
    for (const item of bot.inventory.items()) {
      if (item.name.includes('fishing') || item.name === 'bread') continue;
      await chest.deposit(item.type, null, item.count);
    }
    chest.close();
    bot.chat('✅ Items dumped into chest.');
  } catch (err) {
    bot.chat('❌ Error dumping items: ' + err.message);
  }
}

createBot();
