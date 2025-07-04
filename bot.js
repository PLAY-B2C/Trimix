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
      giveSaturationLoop();
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

function giveSaturationLoop() {
  setInterval(() => {
    const effects = bot.entity?.effects || {};
    const hasSaturation = Object.values(effects).some(e => e.displayName === 'Saturation');
    if (!hasSaturation) {
      bot.chat('/effect give IamChatGPT minecraft:saturation 999999 1 true');
    }
  }, 10000);
}

function aimAndFish() {
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
      bot.chat('🎯 Aiming at fishing spot...');

      bot.on('soundEffectHeard', (sound) => {
        if (sound.soundName.includes('entity.fishing_bobber.splash')) {
          bot.deactivateItem();
          setTimeout(() => bot.activateItem(), 600);
          bot.chat('🎣 Caught something!');
        }
      });
      return;
    }
  }

  bot.chat('❌ No valid trapdoor-water fishing spot found.');
}

createBot();
