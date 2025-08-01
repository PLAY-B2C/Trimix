const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

let rightClickInterval = null

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'DrakonTide',
    auth: 'offline',
    checkTimeoutInterval: 120000 // increase timeout for laggy servers
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.')
    bot.chat('/login 3043AA')
  })

  // 👂 Chat listener
  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (msg.includes('the dungeon will begin')) {
      console.log('🏃 Moving to Mort...')
      goToAndClickMort()
    }

    if (msg.includes('this dungeon will close in')) {
      console.log('⛔ Dungeon closing — disconnecting bot.')
      bot.quit('Dungeon closing')
    }

    if (msg.includes('i first entered the dungeon')) {
      console.log('🤖 Start spamming right click.')
      startRightClickSpam()
    }

    if (msg.includes('you have dealt')) {
      console.log('😴 Stopping right click — going AFK.')
      stopRightClickSpam()
      startKeepAlive()
    }
  })

  function goToAndClickMort() {
    const mort = bot.nearestEntity(e => e.name === 'Mort')
    if (!mort) {
      console.log('❌ Mort NPC not found.')
      return
    }

    const mcData = mcDataLoader(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const pos = mort.position
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 1)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      console.log(`🎯 Reached Mort at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)

      bot.setQuickBarSlot(0)

      setTimeout(() => {
        // Left click
        bot.attack(mort)
        console.log('🖱️ Left-clicked Mort')

        bot.once('windowOpen', (window) => {
          console.log('📦 GUI opened:', window.title)

          let clickedAny = false

          for (let i = 0; i < window.slots.length; i++) {
            const item = window.slots[i]
            if (
              item &&
              (
                item.name === 'red_stained_glass_pane' ||
                (item.name === 'stained_glass_pane' && item.metadata === 14) ||
                item.displayName?.toLowerCase().includes('not ready')
              )
            ) {
              bot.clickWindow(i, 0, 1) // shift-click
              console.log(`✅ Shift-clicked: ${item.displayName || item.name} at slot ${i}`)
              clickedAny = true
            }
          }

          if (!clickedAny) {
            console.log('❌ No red glass panes or Not Ready items found.')
          }

          bot.pathfinder.setGoal(null)
          console.log('😴 Standing still. Waiting for dungeon enter...')
        })
      }, 1000)
    })
  }

  // 🔁 Spam right click
  function startRightClickSpam() {
    if (rightClickInterval) return // already spamming
    rightClickInterval = setInterval(() => {
      bot.setQuickBarSlot(0)
      bot.activateItem()
    }, 300) // adjust speed if needed
  }

  function stopRightClickSpam() {
    if (rightClickInterval) {
      clearInterval(rightClickInterval)
      rightClickInterval = null
    }
  }

  // 📡 Keep alive
  function startKeepAlive() {
    setInterval(() => {
      if (bot && bot.player) {
        bot._client.write('ping', { keepAliveId: Date.now() })
        console.log('📶 Keep-alive ping sent.')
      }
    }, 30000) // every 30s
  }

  // 🔌 Disconnect/Reconnect Handling
  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason)
  })

  bot.on('error', (err) => {
    console.log('💥 Error:', err.message)
  })

  bot.on('end', () => {
    console.log('🔌 Disconnected. Reconnecting in 5 seconds...')
    setTimeout(createBot, 5000)
  })

  // 🛑 Failsafe
  process.on('uncaughtException', (err) => {
    console.error('🛑 Uncaught Exception:', err)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🛑 Unhandled Promise Rejection:', reason)
  })

  return bot
}

createBot()
