const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

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

async function aimAndFish() {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
  if (!rod) {
    bot.chat('❌ No fishing rod in inventory!');
    return;
  }

  try {
    await bot.equip(rod, 'hand');

    const targetPos = bot.vec3(-2769.5, 69, -342.5);
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new goals.GoalBlock(targetPos.x, targetPos.y, targetPos.z));

    bot.chat('🚶 Walking to fishing spot...');
    await bot.waitForTicks(60); // let it reach the spot

    // Align camera
    const yaw = Math.PI * (90 / 180);
    const pitch = Math.PI * (16 / 180);
    await bot.look(yaw, pitch, true);
    bot.setControlState('sneak', true);
    bot.chat('🎯 Aligned camera angle');

    // Start 300ms right-click spam
    if (rightClickInterval) clearInterval(rightClickInterval);
    rightClickInterval = setInterval(() => {
      bot.activateItem(); // right click
    }, 300);

    // Detect splash sound
    bot.on('soundEffectHeard', async (sound) => {
      if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
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

  } catch (err) {
    bot.chat('❌ Error: ' + err.message);
  }
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
    bot.chat('❌ No chest found nearby.');
    return;
  }

  try {
    const chest = await bot.openContainer(chestBlock);
    for (const item of bot.inventory.items()) {
      if (item.name.includes('fishing') || item.name === 'bread') continue;
      await chest.deposit(item.type, null, item.count);
    }
    chest.close();
    bot.chat('✅ Items stored.');
  } catch (err) {
    bot.chat('❌ Chest error: ' + err.message);
  }
}

createBot();
