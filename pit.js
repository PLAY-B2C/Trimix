const mineflayer = require('mineflayer');
const armorManager = require('mineflayer-armor-manager')(mineflayer);
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const Vec3 = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(armorManager);

const TARGET_Y = 85;
const RESPAWN_TIMEOUT = 60000;
const ATTACK_RANGE = 6;
const WHITELIST = ['AdminGuy', 'BotFriend'];

let lastAttackTime = Date.now();
let stuckCheckTimer = null;

bot.once('spawn', () => {
  console.log('✅ Spawned');
  bot.chat('/login ABCDEFG');
  equipBest();
  runMode();
  monitorModes();
  monitorRespawn();
});

bot.on('death', () => {
  console.log('☠️ Bot died. Resuming...');
  runMode();
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

function runMode() {
  console.log('🏃 Entering RUN MODE');
  bot.setControlState('sprint', true);
  bot.setControlState('jump', true);
  bot.pathfinder.setGoal(new GoalBlock(0, 84, 0)); // run toward 0 84 0
}

function attackMode() {
  console.log('⚔️ Entering ATTACK MODE');
  bot.setControlState('sprint', false);
  bot.setControlState('jump', false);
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.allow1by1towers = false;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  const attackLoop = setInterval(() => {
    if (bot.entity.position.y >= TARGET_Y) {
      clearInterval(attackLoop);
      runMode();
      return;
    }

    const player = bot.nearestEntity(e =>
      e.type === 'player' &&
      e.username !== bot.username &&
      !WHITELIST.includes(e.username) &&
      !(e.metadata && e.metadata.some(meta => meta.invisible)) // check for vanish/invisible
    );

    if (player && !isLeatherArmor(player)) {
      const dist = bot.entity.position.distanceTo(player.position);
      bot.lookAt(player.position.offset(0, player.height, 0));
      if (dist <= ATTACK_RANGE) {
        bot.attack(player);
        lastAttackTime = Date.now();
        console.log(`⚔️ Attacking ${player.username}`);
      } else {
        bot.pathfinder.setGoal(new GoalBlock(player.position.x, player.position.y, player.position.z));
      }
    }
  }, 500);
}

function isLeatherArmor(player) {
  const armor = player.equipment;
  return Object.values(armor).some(item => item?.name?.includes('leather'));
}

function equipBest() {
  bot.armorManager.equipAll();
}

function monitorModes() {
  setInterval(() => {
    if (bot.entity.position.y >= TARGET_Y) {
      runMode();
    } else {
      attackMode();
    }

    // Health check (retreat if < 6 hearts)
    if (bot.health < 12) {
      console.log('🛡️ Low health. Retreating...');
      runMode();
    }
  }, 1000);
}

function monitorRespawn() {
  setInterval(() => {
    if (Date.now() - lastAttackTime > RESPAWN_TIMEOUT) {
      console.log('⌛ Idle too long. Respawning...');
      bot.chat('/respawn');
      lastAttackTime = Date.now();
    }
  }, 5000);
}

function stuckCheck() {
  let lastPos = bot.entity.position.clone();
  stuckCheckTimer = setInterval(() => {
    if (bot.entity.position.distanceTo(lastPos) < 0.5) {
      console.log('🪵 Bot might be stuck. Jumping.');
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 1000);
    }
    lastPos = bot.entity.position.clone();
  }, 5000);
}

bot.on('spawn', stuckCheck);
bot.on('error', err => console.log('❌ Error:', err.message));
