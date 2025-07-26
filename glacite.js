const mineflayer = require('mineflayer'); const Vec3 = require('vec3'); const { pathfinder, Movements, goals } = require('mineflayer-pathfinder'); const { GoalNear } = goals;

const botConfig = { host: 'mc.fakepixel.fun', username: 'DrakonTide', version: '1.16.5', loginCommand: '/login 3043AA', warpCommand: '/warp dwarven', glaciteCenter: new Vec3(0, 128, 160), waypoints: [ new Vec3(66, 200, -104), new Vec3(70, 198, -88), new Vec3(-17, 177, -55), new Vec3(-53, 165, -40), new Vec3(-54, 168, -23), new Vec3(-53, 147, -12), new Vec3(-43, 135, 19), new Vec3(-7, 128, -59), new Vec3(0, 128, 160) ] };

let patrolIndex = 0; let reachedGlacite = false; let mode = 'wander';

function createBot() { const bot = mineflayer.createBot({ host: botConfig.host, username: botConfig.username, version: botConfig.version, keepAlive: true, connectTimeout: 60000 });

bot.loadPlugin(pathfinder);

bot.once('spawn', () => { console.log('✅ Spawned. Logging in...'); setTimeout(() => { bot.chat(botConfig.loginCommand); setTimeout(() => openTeleportGUI(bot), 2000); }, 2000); });

bot.on('death', () => { console.log('☠️ Bot died. Resetting...'); patrolIndex = 0; reachedGlacite = false; mode = 'wander'; setTimeout(() => { bot.chat(botConfig.warpCommand); setTimeout(() => startPatrol(bot), 8000); }, 2000); });

bot.on('end', () => { console.log('🔁 Disconnected. Reconnecting in 10s...'); setTimeout(createBot, 10000); });

bot.on('error', err => { console.log('❌ Error:', err.message); }); }

function openTeleportGUI(bot) { bot.setQuickBarSlot(0); bot.activateItem();

bot.once('windowOpen', async window => { await bot.waitForTicks(20); const slot = window.slots[20];

if (slot && slot.name !== 'air') {
  try {
    await bot.clickWindow(20, 0, 1);
    console.log('🎯 Clicked teleport item.');
  } catch (err) {
    console.log('❌ GUI click error:', err.message);
  }
}

setTimeout(() => {
  bot.chat(botConfig.warpCommand);
  setTimeout(() => startPatrol(bot), 8000);
}, 2000);

}); }

function startPatrol(bot) { const mcData = require('minecraft-data')(bot.version); const movements = new Movements(bot, mcData); movements.allowParkour = true; movements.canDig = false; bot.pathfinder.setMovements(movements);

function moveToNext() { if (patrolIndex >= botConfig.waypoints.length) { patrolIndex = botConfig.waypoints.length - 1; }

const target = botConfig.waypoints[patrolIndex];
bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));

const interval = setInterval(() => {
  const dist = bot.entity.position.distanceTo(target);
  if (dist < 2) {
    clearInterval(interval);
    console.log(`📍 Reached waypoint ${patrolIndex}`);
    if (patrolIndex === botConfig.waypoints.length - 1) {
      reachedGlacite = true;
      console.log('🌟 Reached Glacite. Switching to simulation mode...');
      startSimulationLoop(bot);
    } else {
      patrolIndex++;
      setTimeout(moveToNext, 600);
    }
  } else if (!bot.pathfinder.isMoving()) {
    console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
    clearInterval(interval);
    patrolIndex++;
    setTimeout(moveToNext, 600);
  }
}, 400);

}

moveToNext(); }

function startSimulationLoop(bot) { setInterval(() => { if (!reachedGlacite || bot.entity?.health <= 0) return;

const nearbyMob = bot.nearestEntity(e => e.type === 'mob' && e.username === undefined);
if (nearbyMob) {
  mode = 'attack';
  bot.lookAt(nearbyMob.position.offset(0, nearbyMob.height, 0), true, () => {
    if (bot.canSeeEntity(nearbyMob)) bot.attack(nearbyMob);
  });
} else {
  mode = 'wander';
}

}, 400);

setInterval(() => { if (mode === 'wander') { const offsetX = Math.floor(Math.random() * 25) - 12; const offsetZ = Math.floor(Math.random() * 25) - 12; const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ); const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y; bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1)); } }, 8000);

setInterval(() => { if (bot.entity?.health > 0) { bot.setQuickBarSlot(0); bot.activateItem(); } }, 300);

setInterval(() => { const nearbyPlayer = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username); if (nearbyPlayer && Math.random() < 0.2) { bot.lookAt(nearbyPlayer.position.offset(0, 1.6, 0), true); const times = Math.floor(Math.random() * 5) + 3; let count = 0; const sneaky = setInterval(() => { bot.setControlState('sneak', count % 2 === 0); count++; if (count >= times * 2) { bot.setControlState('sneak', false); clearInterval(sneaky); } }, 150); } }, 5000); }

createBot();

