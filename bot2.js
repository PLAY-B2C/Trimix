const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', async () => {
    console.log(`✅ ${config.username} spawned.`);

    // Login
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Logged in with /login ${config.password}`);

      setTimeout(openTeleportChest, 2000);
    }, 1000);
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} error:`, err);
  });

  bot.on('end', () => {
    console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
    setTimeout(startBot, 10000);
  });
}

function openTeleportChest() {
  try {
    bot.setQuickBarSlot(0); // Select slot 1
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Spamming shift-click on slot 21...`);

        const slotToClick = 20;
        let attempts = 1;
        let delay = 300;

        const interval = setInterval(async () => {
          if (attempts <= 0 || !bot.currentWindow) {
            clearInterval(interval);
            console.log(`✅ Finished clicking or window closed.`);
            startPostTeleportBehavior(); // ⬅️ Start new behaviors
            return;
          }

          const slot = bot.currentWindow.slots[slotToClick];
          if (slot) {
            try {
              await bot.clickWindow(slotToClick, 0, 1);
              console.log(`👉 Shift-clicked slot 21`);
            } catch (err) {
              console.error(`⚠️ Failed to click slot 21:`, err.message);
            }
          } else {
            console.log(`❌ Slot 21 is empty or undefined.`);
          }

          attempts--;
        }, delay);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

function startPostTeleportBehavior() {
  console.log(`⏳ Waiting 10 seconds before starting post-teleport behavior...`);
  setTimeout(() => {
    const yaw = bot.entity.yaw;
    const pitch = bot.entity.pitch;

    console.log(`🎯 Locking view direction: yaw=${yaw}, pitch=${pitch}`);

    // 🔒 Lock view
    setInterval(() => {
      bot.look(yaw, pitch, false);
    }, 50);

    equipBestAxe();
    holdLeftClickDig();
    absoluteStrafe(yaw);
    monitorInventoryFull();
  }, 10000);
}

// ⛏️ Equip best available axe
function equipBestAxe() {
  const priorities = ['netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe'];

  for (let name of priorities) {
    const item = bot.inventory.items().find(i => i.name === name);
    if (item) {
      bot.equip(item, 'hand').then(() => {
        console.log(`🪓 Equipped best axe: ${name}`);
      }).catch(err => {
        console.log(`❌ Failed to equip axe: ${err.message}`);
      });
      return;
    }
  }

  console.log(`⚠️ No axe found in inventory.`);
}

// 🧱 Dig blocks in front if in range
function holdLeftClickDig() {
  setInterval(() => {
    const block = bot.blockAtCursor(5);
    if (!block || bot.targetDigBlock) return;

    const playerPos = bot.entity.position;
    const dist = block.position.distanceTo(playerPos);

    if (dist > 2.8 && dist < 5.1) {
      bot.dig(block)
        .then(() => {
          console.log(`🧱 Dug: ${block.name} at ${block.position}`);
        })
        .catch(err => {
          console.log(`❌ Dig error: ${err.message}`);
        });
    }
  }, 100);
}

// 🚶 Strafe left and right without changing view
function absoluteStrafe(initialYaw) {
  let movingLeft = true;

  function getStrafeVector(yaw, direction = 'left') {
    const angle = yaw + (direction === 'left' ? Math.PI / 2 : -Math.PI / 2);
    return {
      x: Math.cos(angle),
      z: Math.sin(angle)
    };
  }

  function strafe() {
    const dir = getStrafeVector(initialYaw, movingLeft ? 'left' : 'right');
    bot.setControlState('forward', false);
    bot.setControlState('back', false);
    bot.setControlState('left', false);
    bot.setControlState('right', false);
    bot.setControlState('jump', false);

    bot.physics.velocity.x = dir.x * 0.1;
    bot.physics.velocity.z = dir.z * 0.1;

    console.log(`🚶 Strafing ${movingLeft ? 'left' : 'right'} for 40s...`);
    setTimeout(() => {
      movingLeft = !movingLeft;
      strafe();
    }, 40000);
  }

  strafe();
}

// 📦 Notify if inventory is full
function monitorInventoryFull() {
  setInterval(() => {
    const full = bot.inventory.items().length >= bot.inventory.slots.length - 9;
    if (full) console.log('📦 Inventory is full!');
  }, 5000);
}

startBot();
