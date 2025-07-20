const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

const config = {
  host: 'mc.cloudpixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login ABCDEFG',
  npcLocation: new Vec3(-29.5, 93, -5.5)
};

let bot;
let reconnecting = false;

function createBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${bot.username} spawned.`);

    if (config.loginCommand) {
      setTimeout(() => bot.chat(config.loginCommand), 1000);
    }

    goToNPC();
  });

  bot.on('error', (err) => {
    console.log(`❌ ${bot.username} error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`❌ ${bot.username} disconnected. Reconnecting...`);
    if (!reconnecting) {
      reconnecting = true;
      setTimeout(() => {
        reconnecting = false;
        createBot();
      }, 10000);
    }
  });
}

function goToNPC() {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);
  bot.pathfinder.setGoal(new goals.GoalBlock(config.npcLocation.x, config.npcLocation.y, config.npcLocation.z));

  bot.once('goal_reached', () => {
    console.log(`🎯 ${bot.username} reached NPC location.`);
    interactWithNPC();
  });
}

function interactWithNPC() {
  const npc = bot.nearestEntity(entity => entity.position.distanceTo(config.npcLocation) < 3);
  if (!npc) {
    console.log("❌ NPC not found near target location.");
    return;
  }

  // Look directly at the NPC
  const lookPoint = npc.position.offset(0, npc.height / 2, 0);
  bot.lookAt(lookPoint, true, () => {
    console.log("👀 Looking at NPC...");
    swingAt(npc, 3, () => {
      startRunning();
    });
  });
}

function swingAt(entity, times, callback) {
  let count = 0;
  const swing = () => {
    if (!entity || count >= times) return callback();

    bot.attack(entity); // Server-detected left-click
    count++;
    setTimeout(swing, 500); // Delay between clicks
  };
  swing();
}

function startRunning() {
  bot.setControlState('forward', true);
  bot.setControlState('sprint', true);
  console.log("🏃 Started running forward...");
}

createBot();
