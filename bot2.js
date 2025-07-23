const mineflayer = require('mineflayer')
const { setTimeout: wait } = require('timers/promises')
let reconnectTimeout = null
let bot

function log(msg) {
  console.log(msg)
}

function startBot() {
  bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5'
  })

  bot.on('login', () => log('✅ Logged in, locking view'))
  bot.once('spawn', async () => {
    log('🎮 Spawned')
    bot.chat('/login 3043AA')

    await wait(2000)
    bot.activateItem() // Right-click to open menu
    log('🖱️ Right-clicked item to open menu')
  })

  bot.once('windowOpen', async (window) => {
    // Wait up to 3s for slot 21 to appear
    for (let i = 0; i < 30; i++) {
      if (window.slots[20]) {
        try {
          await bot.clickWindow(20, 0, 1) // Shift-click slot 21
          log('✅ Shift-clicked slot 21')
        } catch (e) {
          log(`❌ Click failed: ${e.message}`)
        }
        break
      }
      await wait(100)
    }

    if (!window.slots[20]) {
      log('⚠️ Slot 21 empty or not loaded')
    }

    await wait(2000)
    bot.chat('/warp is')
    bot.chat('/warp is')
    log('💬 Sent /warp is x2')

    await wait(8000)
    log('🎯 Locking view & starting dig/strafe loop')
    startDigAndStrafe()
  })

  bot.on('error', err => {
    log(`❌ Bot error: ${err.message}`)
  })

  bot.on('end', () => {
    log('🔌 Disconnected. Reconnecting in 10s...')
    if (reconnectTimeout) return
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      startBot()
    }, 10000)
  })
}

function startDigAndStrafe() {
  // Lock the camera angle by never updating yaw/pitch
  holdLeftClickForever()
  startStrafing()
}

function holdLeftClickForever() {
  try {
    bot.swingArm('right', true) // true = continuous
  } catch (e) {
    log('❌ Dig error: ' + e.message)
  }
}

function startStrafing() {
  let strafeLeft = true
  setInterval(() => {
    bot.setControlState('left', strafeLeft)
    bot.setControlState('right', !strafeLeft)
    strafeLeft = !strafeLeft
  }, 40000) // switch every 40s
}

startBot()
