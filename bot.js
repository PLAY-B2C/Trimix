const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
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
    prepareFishing();
  }, 3000);
});

async function prepareFishing() {
  try {
    await bot.waitForTicks(100);

    const barrelBlock = bot.findBlock({
      matching: block => block.name === 'barrel',
      maxDistance: 6
    });

    if (!barrelBlock) {
      bot.chat('❌ No barrel found nearby!');
      return;
    }

    const barrel = await bot.openContainer(barrelBlock);
    const breadSlot = barrel.containerItems().find(item => item.name === 'bread');

    if (!breadSlot) {
      bot.chat('❌ No bread found inside barrel!');
      barrel.close();
      return;
    }

    await bot.clickWindow(breadSlot.slot, 0, 0);
    barrel.close();

    const breadInInventory = bot.inventory.items().find(i => i.name === 'bread');
    if (breadInInventory) {
      await bot.equip(breadInInventory, 'hand');
      await bot.moveSlotItem(breadInInventory.slot, 8); // slot 9
      bot.chat('🥖 Bread equipped to slot 9!');
    }

    // 🔁 Look at trapdoor/water before fishing
    const fishingSpot = bot.findBlock({
      matching: block => block.name.includes('trapdoor') || block.name.includes('water'),
      maxDistance: 6
    });

    if (fishingSpot) {
      bot.lookAt(fishingSpot.position.offset(0.5, 0.5, 0.5));
      bot.chat('🎯 Aiming at fishing spot...');
    } else {
      bot.chat('⚠️ Could not find a fishing block to aim at.');
    }

    startFishing();

  } catch (err) {
    console.log('❌ Barrel error:', err);
  }
}

function startFishing() {
  bot.chat('🎣 Starting AFK fishing...');
  bot.setControlState('sneak', true);
  bot.activateItem(); // cast rod

  setInterval(() => {
    const hook = bot.entity?.fishingBobber;
    if (!hook) return;

    bot.once('soundEffectHeard', async (sound) => {
      if (sound.soundName.includes('entity.fishing_bobber.splash')) {
        bot.deactivateItem(); // reel in
        setTimeout(() => bot.activateItem(), 600); // cast again
        bot.chat(`🎣 Caught something!`);
      }
    });
  }, 2000);
}

bot.on('kicked', reason => console.log('❌ Kicked:', reason));
bot.on('error', err => console.log('❌ Error:', err));
