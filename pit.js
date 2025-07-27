const mineflayer = require('mineflayer'); const { Vec3 } = require('vec3');

const bot = mineflayer.createBot({ host: 'mc.cloudpixel.fun', username: 'ConnieSpringer', version: '1.16.5', });

let mode = 'run'; let lastAttackTime = Date.now();

bot.once('spawn', () => { console.log('✅ Spawned'); setTimeout(() => { bot.chat('/login ABCDEFG'); setTimeout(() => { bot.setQuickBarSlot(0); bot.activateItem(); bot.once('windowOpen', async (window) => { try { await bot.waitForTicks(40); const slot = window.slots[22]; if (slot && slot.name !== 'air') { await bot.clickWindow(22, 0, 1); console.log('🖱️ Shift-clicked slot 22'); } else { console.log('⚠️ Slot 22 is empty or not ready'); } } catch (err) { console.log('❌ GUI click error:', err.message); } }); startBehaviorLoop(); }, 1000); }, 2000); });

bot.on('death', () => { console.log('☠️ Died. Respawning...'); bot.chat('/respawn'); });

bot.on('end', () => { console.log('🔁 Disconnected. Reconnecting in 10s...'); setTimeout(() => require('child_process').fork(__filename), 10000); });

function startBehaviorLoop() { setInterval(() => { const y = bot.entity.position.y;

if (y >= 85) {
  if (mode !== 'run') {
    console.log('🚀 Switched to Run Mode');
    mode = 'run';
  }

  const targetPos = new Vec3(0, 84, 0);
  const direction = targetPos.minus(bot.entity.position).normalize();

  bot.setControlState('forward', true);
  bot.setControlState('sprint', true);
  bot.setControlState('jump', true);

  const yaw = Math.atan2(-direction.x, -direction.z);
  const pitch = 0;
  bot.look(yaw, pitch, true);
  return;
}

if (mode !== 'attack') {
  console.log('⚔️ Switched to Attack Mode');
  mode = 'attack';
}

const target = bot.nearestEntity(e =>
  e.type === 'player' &&
  e.username !== bot.username
);

if (target) {
  bot.lookAt(target.position.offset(0, target.height, 0), true);
  bot.attack(target);
  lastAttackTime = Date.now();
  console.log(`⚔️ Attacking ${target.username}`);
} else {
  bot.clearControlStates();
}

if (Date.now() - lastAttackTime > 60000) {
  bot.chat('/respawn');
  lastAttackTime = Date.now();
}

}, 500); }

bot.on('error', err => console.log('❌ Error:', err.message));

