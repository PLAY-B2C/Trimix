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
    console.log(`🎯 ${bot.username} reached NPC position.`);
    interactWithNPC(bot);
  });

  function interactWithNPC(bot) {
    const npc = bot.nearestEntity(entity => {
      return entity.type === 'player' && entity.username !== bot.username &&
        entity.position.distanceTo(bot.entity.position) < 4;
    });

    if (!npc) {
      console.log(`❌ ${bot.username} could not find NPC entity.`);
      return;
    }

    // Look at NPC
    bot.lookAt(npc.position.offset(0, 1.6, 0), true, () => {
      // Right click twice
      bot.activateEntity(npc);
      setTimeout(() => bot.activateEntity(npc), 800);

      // Left click (attack) twice
      setTimeout(() => bot.attack(npc), 1600);
      setTimeout(() => bot.attack(npc), 2000);

      // Start sprinting forward
      setTimeout(() => {
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        console.log(`🏃 ${bot.username} is now sprinting forward.`);
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
