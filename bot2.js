const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;

const config = {
  host: 'mc.cloudpixel.fun',
  port: 25565, // default port
  version: '1.8.9',
  password: 'ABCDEFG',
  botNames: ['DrakonTide', 'ConnieSpringer'],
  targetPos: { x: -30.5, y: 92, z: -5.5 }
};

function createBot(username) {
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username,
    version: config.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${username} joined.`);

    // Step 1: Send /login
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 ${username} sent /login`);
    }, 1000);

    // Step 2: Walk to target coordinates
    setTimeout(() => {
      const goal = new GoalBlock(
        Math.floor(config.targetPos.x),
        Math.floor(config.targetPos.y),
        Math.floor(config.targetPos.z)
      );
      const movements = new Movements(bot);
      bot.pathfinder.setMovements(movements);
      bot.pathfinder.setGoal(goal);
    }, 3000);
  });

  bot.on('goal_reached', () => {
    console.log(`🎯 ${username} reached target.`);
    rightClickBlockThenSprint(bot);
  });

  function rightClickBlockThenSprint(bot) {
    // Look straight (horizontal), then right click block below
    bot.look(bot.entity.yaw, 0, true, () => {
      const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0));

      if (blockBelow) {
        bot.activateBlock(blockBelow); // First right click
        setTimeout(() => bot.activateBlock(blockBelow), 1000); // Second right click
        console.log(`🖱️ ${bot.username} looked forward and right-clicked the block below twice.`);
      } else {
        console.log(`⚠️ ${bot.username} couldn't find a block below to right-click.`);
      }

      setTimeout(() => {
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        console.log(`🏃 ${bot.username} is sprinting forward.`);
      }, 2000);
    });
  }

  bot.on('end', () => {
    console.log(`❌ ${username} disconnected. Reconnecting...`);
    setTimeout(() => createBot(username), 10000);
  });

  bot.on('error', err => {
    console.log(`⚠️ ${username} error: ${err.message}`);
  });
}

// Launch the bots
config.botNames.forEach(name => createBot(name));
