const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mc = require('minecraft-protocol');

const config = {
  host: 'testserverboltmc.falixsrv.me',
  port: 38495,
  version: '1.8.9',
  password: '3043AA',
  botNames: ['ConnieSpringer', 'SashaBraus', 'HangeZoe', 'JeanKirstein', 'FlochForster'],
  targetPos: { x: -30.5, y: 92, z: -5.5 }
};

let reconnecting = new Set();

function startBot(username) {
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username,
    version: config.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${username} spawned.`);

    let loggedIn = false;

    bot.on('chat', (sender, message) => {
      if (loggedIn) return;
      if (message.toLowerCase().includes('/register')) {
        bot.chat(`/register ${config.password} ${config.password}`);
        loggedIn = true;
        setTimeout(() => goToStart(bot), 2000);
      } else if (message.toLowerCase().includes('/login')) {
        bot.chat(`/login ${config.password}`);
        loggedIn = true;
        setTimeout(() => goToStart(bot), 2000);
      }
    });
  });

  bot.on('error', err => {
    console.log(`❌ ${username} error: ${err.code}`);
    reconnect(username);
  });

  bot.on('end', () => {
    console.log(`❌ ${username} disconnected. Reconnecting...`);
    reconnect(username);
  });
}

function goToStart(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  const goal = new goals.GoalBlock(
    Math.floor(config.targetPos.x),
    Math.floor(config.targetPos.y),
    Math.floor(config.targetPos.z)
  );

  bot.chat('👣 Walking to the portal...');
  bot.pathfinder.setGoal(goal);

  const checkArrival = setInterval(() => {
    const pos = bot.entity.position;
    const dx = Math.abs(pos.x - config.targetPos.x);
    const dy = Math.abs(pos.y - config.targetPos.y);
    const dz = Math.abs(pos.z - config.targetPos.z);

    if (dx <= 1 && dy <= 2 && dz <= 1) {
      clearInterval(checkArrival);
      rightClickTwice(bot);
    }
  }, 500);
}

function rightClickTwice(bot) {
  bot.chat('📦 Interacting...');
  bot.activateItem(); // first click
  setTimeout(() => {
    bot.activateItem(); // second click
    setTimeout(() => {
      startRunning(bot);
    }, 3000); // wait 3 sec for teleport
  }, 1000);
}

function startRunning(bot) {
  bot.chat('🏃 Running forward!');
  bot.setControlState('forward', true);

  // Optional: Auto-jump
  bot.setControlState('jump', true);
}

function reconnect(username) {
  if (reconnecting.has(username)) return;
  reconnecting.add(username);

  setTimeout(() => {
    reconnecting.delete(username);
    startBot(username);
  }, 10000);
}

// Start all 5 bots
config.botNames.forEach(name => startBot(name));
