const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;

const config = {
  host: 'mc.cloudpixel.fun',
  port: 25565,
  version: '1.8.9',
  password: 'ABCDEFG',
  botNames: ['DrakonTide', 'ConnieSpringer'],
  npcPos: { x: -29.5, y: 93, z: -5.5 }
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

    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 ${username} sent /login`);
    }, 1000);

    setTimeout(() => {
      const goal = new GoalBlock(
        Math.floor(config.npcPos.x),
        Math.floor(config.npcPos.y),
        Math.floor(config.npcPos.z)
      );
      const movements = new Movements(bot);
      bot.pathfinder.setMovements(movements);
      bot.pathfinder.setGoal(goal);
    }, 3000);
  });

  bot.on('goal_reached', () => {
    console.log(`🎯 ${bot.username} reached NPC.`);
    interactWithNPC(bot);
  });

  function interactWithNPC(bot) {
    // Face forward (horizontal only)
    bot.look(bot.entity.yaw, 0, true, () => {
      const block = bot.blockAt(bot.entity.position.offset(0, -1, 0));

      if (block) {
        // Right click NPC
        bot.activateBlock(block); // Right click 1
        setTimeout(() => bot.activateBlock(block), 800); // Right click 2

        // Left click NPC
        setTimeout(() => bot.swingArm('right'), 1600); // Left click 1
        setTimeout(() => bot.swingArm('right'), 2000); // Left click 2

        console.log(`🤝 ${bot.username} interacted with NPC.`);
      } else {
        console.log(`⚠️ ${bot.username} couldn't find block under to click.`);
      }

      // Sprint forward
      setTimeout(() => {
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        console.log(`🏃 ${bot.username} started sprinting forward.`);
      }, 3000);
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

config.botNames.forEach(name => createBot(name));
