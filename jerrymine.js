const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: false,
});

bot.loadPlugin(pathfinder);

const loginCommand = '/login 3043AA';

const waypoint1 = new Vec3(1, 76, 58);
const waypoint2 = new Vec3(40, 76, 55);

let guiClicked = false;
let holdingItem = false;

bot.once('spawn', async () => {
  console.log('✅ Bot spawned');
  bot.chat(loginCommand);

  // Wait 3s, then right-click to open GUI
  setTimeout(() => {
    const item = bot.inventory.slots[36];
    if (item) {
      bot.activateItem();
    }
  }, 3000);
});

bot.on('windowOpen', async (window) => {
  console.log('📦 Opened GUI');

  const slotIndex = 20;
  const slot = window.slots[slotIndex];
  if (slot && slot.name !== 'air') {
    try {
      await bot.clickWindow(slotIndex, 0, 1);
      console.log('✅ Clicked GUI slot 21');
    } catch (err) {
      console.log('❌ Error clicking slot 21:', err.message);
    }
  }

  // Wait 2 seconds before continuing
  setTimeout(() => {
    // Hold item in slot 9
    bot.setQuickBarSlot(8);
    bot.activateItem();
    console.log('🧊 Holding item in slot 9');
    
    // Wait 1 second and shift-click slot 39
    setTimeout(async () => {
      const slot38 = window.slots[38];
      if (slot38 && slot38.name !== 'air') {
        try {
          await bot.clickWindow(38, 0, 1);
          console.log('✅ Clicked GUI slot 39');
        } catch (err) {
          console.log('❌ Error clicking slot 39:', err.message);
        }
      }

      // After GUI interaction, begin moving to ice mine
      goToWaypoint(waypoint1, () => {
        goToWaypoint(waypoint2, () => {
          console.log('⛏️ Arrived at ice mine.');
          startMining();
        });
      });

    }, 1000);

  }, 2000);
});

function goToWaypoint(pos, callback) {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  defaultMove.allow1by1towers = false;
  defaultMove.scafoldingBlocks = [];

  bot.pathfinder.setMovements(defaultMove);
  bot.pathfinder.setGoal(new GoalNear(pos.x, pos.y, pos.z, 1));

  bot.once('goal_reached', () => {
    console.log(`📍 Reached ${pos.x} ${pos.y} ${pos.z}`);
    if (callback) callback();
  });
}

function startMining() {
  // Hold pickaxe in slot 3
  bot.setQuickBarSlot(2);
  bot.activateItem();

  const block = bot.blockAt(bot.entity.position.offset(0, 0, 1));
  if (block && block.name.includes('ice')) {
    bot.dig(block, true).then(() => {
      console.log('⛏️ Mined ice block');
    }).catch(err => {
      console.log('❌ Mining error:', err.message);
    });
  } else {
    console.log('🧊 No ice block directly in front');
  }
}

bot.on('error', err => {
  console.log('❌ Bot error:', err.message);
});

bot.on('end', () => {
  console.log('🔁 Bot disconnected. Reconnecting in 10s...');
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});
