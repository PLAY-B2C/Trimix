const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

const botNames = ['DrakonTide', 'ConnieSpringer'];
const server = 'mc.cloudpixel.fun';
const loginPassword = 'ABCDEFG';
const version = '1.16.5';
const npcPos = new Vec3(-30, 92, -5);

botNames.forEach((name, i) => startBot(name, i * 5000)); // delay bots

function startBot(username, delay) {
  setTimeout(() => {
    const bot = mineflayer.createBot({
      host: server,
      username,
      version
    });

    bot.loadPlugin(pathfinder);

    bot.once('spawn', () => {
      console.log(`✅ ${username} spawned.`);

      // Send login command
      setTimeout(() => {
        bot.chat(`/login ${loginPassword}`);
      }, 1000);

      // Walk to NPC after login
      setTimeout(() => goToNPC(bot), 3000);
    });

    bot.on('end', () => {
      console.log(`❌ ${username} disconnected. Reconnecting...`);
      startBot(username, 10000);
    });

    bot.on('error', err => {
      console.log(`❌ ${username} error: ${err.message}`);
    });
  }, delay);
}

function goToNPC(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  const goal = new goals.GoalBlock(npcPos.x, npcPos.y, npcPos.z);
  bot.pathfinder.setGoal(goal);

  bot.once('goal_reached', () => {
    console.log(`🎯 ${bot.username} reached NPC location.`);
    interactWithNPC(bot);
  });
}

function interactWithNPC(bot) {
  const npc = bot.nearestEntity(e => e.type === 'player' && e.username && e.username !== bot.username);
  
  if (!npc) {
    console.log('❌ No NPC found nearby.');
    return;
  }

  // Look at NPC's head and simulate clicks
  const lookPos = npc.position.offset(0, 1.6, 0);
  bot.lookAt(lookPos, true, () => {
    console.log(`👀 ${bot.username} looking at NPC ${npc.username}`);

    setTimeout(() => {
      // Left click x3
      for (let i = 0; i < 3; i++) {
        bot.attack(npc);
        bot.swingArm('right');
      }

      // Right click x2
      for (let i = 0; i < 2; i++) {
        bot.activateEntity(npc); // right click
      }

      // Start sprinting forward
      startSprinting(bot);
    }, 1000);
  });
}

function startSprinting(bot) {
  bot.setControlState('sprint', true);
  bot.setControlState('forward', true);
  console.log(`🏃 ${bot.username} is sprinting forward.`);
}
