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
    attackNPC(bot);
  });

  function attackNPC(bot) {
    const npc = bot.nearestEntity(entity =>
      entity.type === 'player' &&
      entity.username !== bot.username &&
      entity.position.distanceTo(bot.entity.position) < 4
    );

    if (!npc) {
      console.log(`❌ ${bot.username} couldn't find NPC entity.`);
      return;
    }

    // Look at NPC
    bot.lookAt(npc.position.offset(0, 1.6, 0), true, () => {
      // Attack 3 times
      bot.attack(npc);
      setTimeout(() => bot.attack(npc), 600);
      setTimeout(() => bot.attack(npc), 1200);

      // Start sprinting forward
      setTimeout(() => {
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        console.log(`🏃 ${bot.username} is now sprinting forward.`);
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

config.botNames.forEach(name => createBot(name));
