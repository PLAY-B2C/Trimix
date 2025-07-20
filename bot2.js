const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const { GoalBlock } = goals;

const config = {
  host: 'mc.cloudpixel.fun',
  port: 25565,
  version: '1.8.9',
  password: 'ABCDEFG',
  botNames: ['DrakonTide', 'ConnieSpringer'],
  npcCoords: { x: -29.5, y: 93, z: -5.5 }
};

function createBot(username) {
  const bot = mineflayer.createBot({
    host: config.host,
    username,
    version: config.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${username} spawned.`);

    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
    }, 1000);

    setTimeout(() => {
      const goal = new GoalBlock(
        Math.floor(config.npcCoords.x),
        Math.floor(config.npcCoords.y),
        Math.floor(config.npcCoords.z)
      );
      const defaultMove = new Movements(bot);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(goal);
    }, 3000);

    // Start swinging forever
    setInterval(() => {
      if (bot && bot.entity) {
        bot.swingArm('right');
      }
    }, 500); // every 0.5s
  });

  bot.on('goal_reached', () => {
    console.log(`🎯 ${username} reached NPC location.`);
    startRunning(bot);
  });

  function startRunning(bot) {
    bot.setControlState('forward', true);
    bot.setControlState('sprint', true);
    console.log(`🏃 ${bot.username} is sprinting.`);
  }

  bot.on('end', () => {
    console.log(`❌ ${username} disconnected. Reconnecting...`);
    setTimeout(() => createBot(username), 10000);
  });

  bot.on('error', err => {
    console.log(`⚠️ ${username} error: ${err.message}`);
  });
}

config.botNames.forEach(name => createBot(name));
