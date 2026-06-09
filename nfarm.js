const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  if (typeof msg === 'string' && msg.includes('chunk failed to load')) return;
  originalWarn(msg, ...args);
};

const botConfig = {
  host: 'fakepixel.fun',
  username: 'DrakonTide',
  version: '1.8.9',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp island',
};

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
    keepAlive: true,
    checkTimeoutInterval: 60000
  });

  let alive = true;
  let farmingActive = false;
  let movingRight = true;
  let lastY = null;
  let clickInterval = null;

  // ── Clicking ───────────────────────────────────────────────────────────────
  function startClicking() {
    stopClicking();
    bot.setQuickBarSlot(0);
    let running = true;

    function attack() {
      if (!alive || !farmingActive || !running) return;
      const block = bot.blockAtCursor(4);
      if (block) {
        bot._client.write('block_dig', {
          status: 0,
          location: block.position,
          face: 1
        });
      }
      setImmediate(attack);
    }

    clickInterval = { stop: () => { running = false; } };
    attack();
    console.log('🖱️ Holding attack on slot 0.');
  }

  function stopClicking() {
    if (clickInterval) { clickInterval.stop(); clickInterval = null; }
  }

  // ── GUI (copied from reference bot) ───────────────────────────────────────
  function openTeleportGUI() {
    bot.setQuickBarSlot(0);
    bot.activateItem();
    bot.once('windowOpen', async window => {
      if (!alive) return;
      await new Promise(res => setTimeout(res, 1000));
      if (!alive) return;
      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1);
          console.log('🎯 Clicked teleport item.');
        } catch (err) {
          console.log('❌ GUI click error:', err.message);
        }
      }
      if (!alive) return;
      setTimeout(() => {
        if (!alive) return;
        bot.chat(botConfig.warpCommand);
        setTimeout(() => { if (alive) startFarming(); }, 5000);
      }, 2000);
    });
  }

  // ── Farming movement ───────────────────────────────────────────────────────
  function startFarming() {
    if (farmingActive) return;
    farmingActive = true;
    lastY = bot.entity.position.y;

    bot.setQuickBarSlot(0);
    bot.look(Math.PI / 2, 0, true);
    console.log('🌾 Farming started — moving right.');

    startClicking();
    setMoveDirection('right');

    // Nudge forward 100ms every 10 seconds
    const nudgeInterval = setInterval(() => {
      if (!alive || !farmingActive) { clearInterval(nudgeInterval); return; }
      bot.look(Math.PI / 2, 0, true);
      bot.setControlState('forward', true);
      setTimeout(() => bot.setControlState('forward', false), 100);
    }, 10000);

    // Poll for Y drop every 200ms
    const poll = setInterval(() => {
      if (!alive || !farmingActive) { clearInterval(poll); return; }

      const currentY = bot.entity.position.y;
      const drop = lastY - currentY;

      if (drop >= 2) {
        lastY = currentY;
        movingRight = !movingRight;
        const dir = movingRight ? 'right' : 'left';
        console.log(`⬇️ Dropped ${drop.toFixed(1)} blocks — switching to ${dir}`);
        setMoveDirection(dir);
      }
    }, 200);
  }

  function setMoveDirection(dir) {
    bot.setControlState('left', false);
    bot.setControlState('right', false);
    if (dir === 'right') {
      bot.setControlState('right', true);
    } else {
      bot.setControlState('left', true);
    }
    bot.look(Math.PI / 2, 0, true);
  }

  function stopFarming() {
    farmingActive = false;
    bot.setControlState('right', false);
    bot.setControlState('left', false);
    bot.setControlState('forward', false);
    stopClicking();
    console.log('🛑 Farming stopped.');
  }

  // ── Bot lifecycle ──────────────────────────────────────────────────────────
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    try {
      bot._client.socket.setTimeout(24 * 60 * 60 * 1000);
      bot._client.socket.setKeepAlive(true, 10000);
    } catch (_) {}
    console.log('✅ Spawned');
    bot.manualQuit = false;
    setTimeout(() => {
      if (!alive) return;
      bot.chat(botConfig.loginCommand);
      setTimeout(() => { if (alive) openTeleportGUI(); }, 2000);
    }, 2000);
  });

  bot.on('message', (jsonMsg, position) => {
    if (position === 'game_info') return;
    console.log(`💬 ${jsonMsg.toString()}`);
  });

  bot.on('death', () => {
    if (!alive) return;
    console.log('☠️ Died. Restarting...');
    stopFarming();
    movingRight = true;
    setTimeout(() => {
      if (!alive) return;
      bot.chat(botConfig.warpCommand);
      setTimeout(() => { if (alive) startFarming(); }, 5000);
    }, 2000);
  });

  bot.on('end', () => {
    alive = false;
    stopFarming();
    if (!bot.manualQuit) {
      console.log('🔁 Disconnected. Reconnecting in 10s...');
      setTimeout(createBot, 10000);
    } else {
      console.log('🛑 Bot quit manually. No reconnect.');
    }
  });

  bot.on('error', err => console.log('❌ Error:', err.message));

  bot.quitBot = function () {
    bot.manualQuit = true;
    alive = false;
    stopFarming();
    bot.quit();
  };
}

createBot();
