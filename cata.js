const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcData = require('minecraft-data')

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'JamaaLcaliph',
    auth: 'offline',
    checkTimeoutInterval: 60000 // Keeps bot alive longer
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.')
    bot.chat('/login 3043AA')
  })

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    // Retry login if needed
    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    // Trigger action on "is holding"
    if (msg.includes('is holding')) {
      console.log('📣 Detected "is holding" — beginning task.')
      goToB2C(bot)
    }
  })

  function goToB2C(bot) {
    const target = bot.players['B2C']?.entity
    if (!target) {
      console.log('❌ Player B2C not found.')
      return
    }

    const data = mcData(bot.version)
    const movements = new Movements(bot, data)
    bot.pathfinder.setMovements(movements)

    const pos = target.position
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 1)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      console.log(`🎯 Reached B2C at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)

      // Delay to ensure GUI can open
      setTimeout(() => {
        bot.setQuickBarSlot(2) // Slot index 2 (3rd slot)
        bot.activateItem()
        console.log('🎮 Activated item in hotbar slot 2.')

        // Wait for GUI to open
        bot.once('windowOpen', (window) => {
          console.log('📦 GUI opened:', window.title)

          let found = false
          for (let i = 0; i < window.slots.length; i++) {
            const item = window.slots[i]
            if (
              item &&
              (item.name === 'red_stained_glass_pane' ||
               (item.name === 'stained_glass_pane' && item.metadata === 14))
            ) {
              bot.clickWindow(i, 0, 1) // shift-click
              console.log(`✅ Shift-clicked red glass pane at slot ${i}`)
              found = true
            }
          }

          if (!found) {
            console.log('❌ No red stained glass panes found.')
          }

          bot.pathfinder.setGoal(null) // Stop movement
          console.log('😴 Bot is now standing still. Session will stay alive.')
        })

      }, 1000)
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

  return bot
}

createBot()
