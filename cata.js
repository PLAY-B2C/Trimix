const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'DrakonTide',
    auth: 'offline',
    checkTimeoutInterval: 60000
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.')
    bot.chat('/login 3043AA')
  })

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (msg.includes('is holding')) {
      console.log('📣 Detected "is holding" — beginning task.')
      goToAndActivateAtB2C()
    }
  })

  function goToAndActivateAtB2C() {
    const b2c = bot.players['B2C']?.entity
    if (!b2c) {
      console.log('❌ Player B2C not found.')
      return
    }

    const mcData = mcDataLoader(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const pos = b2c.position
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 1)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      console.log(`🎯 Reached B2C at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
      bot.setQuickBarSlot(0)

      const spamInterval = setInterval(() => {
        bot.activateItem()
      }, 300)

      const stopSpam = () => clearInterval(spamInterval)
      bot.once('windowOpen', stopSpam)
      bot.once('kicked', stopSpam)
      bot.once('end', stopSpam)
      bot.once('death', stopSpam)

      bot.on('windowOpen', (window) => {
        console.log('📦 GUI opened:', window.title)

        let clickedAny = false

        for (let i = 0; i < window.slots.length; i++) {
          const item = window.slots[i]
          if (!item) continue

          const isRedPane =
            item.name === 'red_stained_glass_pane' ||
            (item.name === 'stained_glass_pane' && item.metadata === 14)

          const isNotReady = item.displayName?.toLowerCase().includes('not ready')

          if (isRedPane || isNotReady) {
            bot.clickWindow(i, 0, 1) // shift-click
            console.log(`✅ Shift-clicked ${item.displayName || item.name} at slot ${i}`)
            clickedAny = true
          }
        }

        if (!clickedAny) {
          console.log('❌ No red glass panes or "Not Ready" items found.')
        }
      })
    })
  }

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
}

createBot()
