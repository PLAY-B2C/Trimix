const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');

const bot = mineflayer.createBot({
  host: 'mc.cloudpixel.fun',
  username: 'ConnieSpringer',
  version: '1.16.5',
});

const WHITELIST = ['AdminName', 'Friend123'];
let lastAttackTime = Date.now();
let stuckTimer = null;
let lastPos = null;

bot.once('spawn', () => {
  console.log('✅ Spawned');
  bot.chat('/login ABCDEFG');
  setTimeout(() => bot.chat('/respawn'), 2000);
  mainLoop();
});

bot.on('death', () => {
  console.log('☠️ Died. Respawning...');
  bot.chat('/respawn');
});

bot.on('end', () => {
  console.log('🔁 Disconnected. Reconnecting in 10s...');
  setTimeout(() => require('child_process').fork(__filename), 10000);
});

function mainLoop() {
  setInterval(() => {
    const y = bot.entity.position.y;

    // === Mode switch ===
    if (y >= 85) {
      runMode();
    } else {
      attackMode();
    }

    // === Stuck detection ===
    if (lastPos && bot.entity.position.distanceTo(lastPos) < 0.2) {
      if (!stuckTimer) stuckTimer = Date.now();
      else if (Date.now() - stuckTimer > 30000) {
        console.log('🚨 Stuck detected. Respawning...');
        bot.chat('/respawn');
        stuckTimer = null;
      }
    } else {
      lastPos = bot.entity.position.clone();
      stuckTimer = null;
    }

    // === Idle respawn in attack mode ===
    if (y < 85 && Date.now() - lastAttackTime > 60000) {
      console.log('⏱️ Idle too long in attack mode. Respawning...');
      bot.chat('/respawn');
      lastAttackTime = Date.now();
    }

    detectVanishPlayers();
  }, 500);
}

function runMode() {
  bot.setControlState('sprint', true);
  bot.setControlState('jump', true);
  bot.setControlState('forward', true);

  const targetVec = new Vec3(0, 84, 0);
  const dir = targetVec.minus(bot.entity.position).normalize();
  bot.lookAt(bot.entity.position.plus(dir), true);
}

function attackMode() {
  bot.setControlState('sprint', false);
  bot.setControlState('jump', false);

  const target = bot.nearestEntity(entity =>
    entity.type === 'player' &&
    entity.username !== bot.username &&
    !WHITELIST.includes(entity.username)
  );

  if (target) {
    bot.lookAt(target.position.offset(0, target.height, 0), true);
    bot.setControlState('forward', true);
    bot.attack(target);
    console.log(`⚔️ Attacking ${target.username}`);
    lastAttackTime = Date.now();
  } else {
    bot.clearControlStates();
  }
}

function detectVanishPlayers() {
  const visible = Object.values(bot.entities)
    .filter(e => e.type === 'player')
    .map(e => e.username);

  const online = Object.keys(bot.players || {});
  const vanished = online.filter(name =>
    !visible.includes(name) && name !== bot.username && !WHITELIST.includes(name)
  );

  if (vanished.length > 0) {
    console.log('👻 Vanish/invisible players detected:', vanished.join(', '));
  }
}

bot.on('error', err => console.log('❌ Error:', err.message));
