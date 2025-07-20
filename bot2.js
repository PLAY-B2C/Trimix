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
  });

  bot.on('goal_reached', () => {
    console.log(`🎯 ${username} reached NPC location.`);
    simulateNpcClick(bot);
  });

  function simulateNpcClick(bot) {
    const { x, y, z } = config.npcCoords;

    bot.lookAt(new Vec3(x, y + 1.5, z), true, () => {
      console.log(`👀 ${username} looking at NPC position`);

      swingRepeatedly(bot, 3, () => {
        console.log(`🗡️ ${username} finished swinging.`);
        startRunning(bot);
      });
    });
  }

  function swingRepeatedly(bot, times, cb, count = 0) {
    if (count >= times) return cb();
    bot.swingArm('right');
    setTimeout(() => swingRepeatedly(bot, times, cb, count + 1), 500);
  }

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
