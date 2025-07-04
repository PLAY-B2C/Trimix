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
    giveSaturationLoop();
    aimAndFish();
  }, 3000);
});

function giveSaturationLoop() {
  const checkAndGive = () => {
    const hasSaturation = bot.hasEffect('saturation');
    if (!hasSaturation) {
      bot.chat('/effect give IamChatGPT minecraft:saturation 999999 1 true');
    }
  };
  checkAndGive();
  setInterval(checkAndGive, 10000); // every 10 seconds
}

function aimAndFish() {
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
}

function startFishing() {
  bot.chat('🎣 Starting AFK fishing...');
  bot.setControlState('sneak', true);
  bot.activateItem();

  setInterval(() => {
    const hook = bot.entity?.fishingBobber;
    if (!hook) return;

    bot.once('soundEffectHeard', async (sound) => {
      if (sound.soundName.includes('entity.fishing_bobber.splash')) {
        bot.deactivateItem();
        setTimeout(() => bot.activateItem(), 600);
        bot.chat(`🎣 Caught something!`);
      }
    });
  }, 2000);
}

bot.on('kicked', reason => console.log('❌ Kicked:', reason));
bot.on('error', err => console.log('❌ Error:', err));
