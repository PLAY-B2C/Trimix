const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5'
});

const loginCommand = '/login 3043AA';
const waypoint1 = new Vec3(1, 76, 58);
const waypoint2 = new Vec3(40, 76, 55);
let state = 'start';

bot.loadPlugin(pathfinder);

bot.once('spawn', async () => {
  console.log('✅ Bot spawned');
  bot.chat(loginCommand);

  setTimeout(() => {
    bot.setQuickBarSlot(0); // Select item in hotbar slot 0
    bot.activateItem();     // Right-click
  }, 4000);
});

bot.once('windowOpen', async (window) => {
  console.log('📦 Opened first GUI');
  try {
    await bot.clickWindow(20, 0, 1); // Shift-click 21st slot
    console.log('✅ Clicked slot 21');
    setTimeout(() => {
      bot.setQuickBarSlot(8); // 9th hotbar slot
      bot.activateItem(); // Right-click with item in slot 8
    }, 2000);
  } catch (err) {
    console.error('❌ Failed slot 21 click:', err.message);
  }
});

bot.on('windowOpen', async (window) => {
  if (state === 'start') {
    state = 'second_gui';
    try {
      await bot.clickWindow(38, 0, 1); // Shift-click 39th slot
      console.log('✅ Clicked slot 39');
      startPath();
    } catch (err) {
      console.error('❌ Failed slot 39 click:', err.message);
    }
  }
});

function startPath() {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  goToWaypoint(waypoint1, () => {
    goToWaypoint(waypoint2, () => {
      console.log('📍 Arrived at ice mine. Starting scan...');
      equipPickaxe();
      startMiningLoop();
    });
  });
}

function goToWaypoint(pos, cb) {
  bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
  const check = setInterval(() => {
    if (bot.entity.position.distanceTo(pos) < 2) {
      clearInterval(check);
      cb();
    }
  }, 1000);
}

function equipPickaxe() {
  const pick = bot.inventory.items().find(i => i.name.includes('pickaxe'));
  if (pick) {
    bot.equip(pick, 'hand').then(() => {
      console.log('⛏ Pickaxe equipped');
    }).catch(console.error);
  } else {
    console.log('❌ No pickaxe found in inventory');
  }
}

function startMiningLoop() {
  setInterval(() => {
    const block = bot.blockAt(bot.entity.position.offset(0, 0, 1));
    if (block && block.name.includes('ice')) {
      bot.dig(block).then(() => {
        console.log(`🧊 Mined: ${block.name}`);
      }).catch(console.error);
    } else {
      // Look left or right to find ice
      scanNearbyForIce();
    }
  }, 3000);
}

function scanNearbyForIce() {
  const nearby = bot.findBlock({
    matching: block => block.name.includes('ice'),
    maxDistance: 6
  });
  if (nearby) {
    bot.pathfinder.setGoal(new goals.GoalBlock(nearby.position.x, nearby.position.y, nearby.position.z));
    console.log(`🔍 Moving to ice at ${nearby.position}`);
  }
}
