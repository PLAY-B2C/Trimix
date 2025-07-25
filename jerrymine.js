const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5'
});

const loginCommand = '/login 3043AA';
let guiStage = 0;
let guiHandled = false;

bot.once('spawn', () => {
  console.log('✅ Bot spawned');
  bot.chat(loginCommand);

  setTimeout(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem();
  }, 2000);
});

bot.on('windowOpen', async (window) => {
  if (guiHandled) return;
  guiHandled = true;
  console.log('📦 Opened GUI');

  try {
    if (guiStage === 0) {
      await bot.clickWindow(20, 0, 1); // Shift-click slot 21
      console.log('✅ Clicked GUI slot 21');

      setTimeout(() => {
        bot.setQuickBarSlot(8); // Hold slot 9
        bot.activateItem();
        console.log('🧊 Holding item in slot 9');

        setTimeout(async () => {
          const slot38 = window.slots[38];
          if (slot38 && slot38.name !== 'air') {
            try {
              await bot.clickWindow(38, 0, 1); // Shift-click slot 39
              console.log('✅ Clicked GUI slot 39');
            } catch (err) {
              console.log('❌ Failed to click slot 39:', err.message);
            }
          }

          // Go to ice mine after GUI done
          moveToIceMine();

        }, 1000);
      }, 2000);
    }
  } catch (err) {
    console.log('❌ Error in GUI:', err.message);
  }
});

// Waypoints to ice mine
const waypoint1 = new Vec3(-10, 72, -17);
const waypoint2 = new Vec3(7, 70, -36);

function moveToIceMine() {
  bot.loadPlugin(pathfinder);
  const defaultMove = new Movements(bot);
  bot.pathfinder.setMovements(defaultMove);

  goToWaypoint(waypoint1, () => {
    goToWaypoint(waypoint2, () => {
      console.log('⛏️ Reached ice mine, starting mining');
      startMining();
    });
  });
}

function goToWaypoint(pos, cb) {
  bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
  bot.once('goal_reached', cb);
}

function startMining() {
  bot.setQuickBarSlot(2); // Pickaxe assumed in slot 3
  setInterval(() => {
    const target = bot.blockAt(bot.entity.position.offset(0, -1, 1));
    if (target && bot.canDigBlock(target)) {
      bot.dig(target).catch(() => {});
    }
  }, 1500);
}

// Reconnect on disconnect
bot.on('end', () => {
  console.log('❌ Bot disconnected. Reconnecting...');
  setTimeout(() => process.exit(1), 10000); // Use PM2 or bash to restart
});

bot.on('error', (err) => {
  console.log('❌ Bot error:', err.message);
});
