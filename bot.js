const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

let bot;
let reconnectTimeout = null;

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

  bot.equip(rod, 'hand').then(() => {
    const waterBlocks = bot.findBlocks({
      matching: block => block.name === 'water',
      maxDistance: 6,
      count: 10
    });

    for (const pos of waterBlocks) {
      const waterBlock = bot.blockAt(pos);
      const above = bot.blockAt(waterBlock.position.offset(0, 1, 0));

      if (above && above.name.includes('trapdoor')) {
        bot.lookAt(above.position.offset(0.5, 0.5, 0.5), true);
        bot.setControlState('sneak', true);
        bot.activateItem();
        bot.chat('🎯 Aiming and casting fishing rod...');

        bot.on('soundEffectHeard', async (sound) => {
          if (!sound || !sound.soundName) return;
          if (sound.soundName.includes('entity.fishing_bobber.splash')) {
            bot.deactivateItem();

            setTimeout(() => {
              bot.activateItem();
            }, 600);

            const full = isInventoryFull();
            if (full) {
              bot.chat('📦 Inventory full, dumping to chest...');
              await dumpToChest();
            }

            const caught = bot.inventory.items().slice(-1)[0];
            if (caught) {
              bot.chat(`🎣 Caught: ${caught.name}`);
            }
          }
        });

        return;
      }
    }

    bot.chat('❌ No valid trapdoor-water fishing spot found.');
  }).catch(err => {
    bot.chat('❌ Failed to equip fishing rod: ' + err.message);
  });
}

function isInventoryFull() {
  const emptySlots = bot.inventory.emptySlotCount();
  return emptySlots === 0;
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
      if (item.name === 'bread' || item.name.includes('fishing')) continue;
      await chest.deposit(item.type, null, item.count);
    }
    chest.close();
    bot.chat('✅ Items dumped into chest.');
  } catch (err) {
    bot.chat('❌ Error dumping items: ' + err.message);
  }
}

createBot();
