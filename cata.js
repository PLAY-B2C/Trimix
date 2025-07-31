const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'JamaaLcaliph',
    auth: 'offline',
    checkTimeoutInterval: 60000 // Keepalive timer
  })

  bot.loadPlugin(pathfinder)

  let waitingForWorldLoad = false

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.')
    bot.chat('/login 3043AA')
  })

  // Login retry
  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    // Start behavior after "is holding"
    if (msg.includes('is holding')) {
      console.log('📣 Detected "is holding" message.')

      // Delay behavior until after world is fully loaded
      if (waitingForWorldLoad) {
        console.log('⏳ Waiting for teleport/server change to complete...')
        return
      }
      safeGoToB2C()
    }
  })

  // Detect dimension swap or server switch
  bot.on('respawn', () => {
    console.log('🌐 Respawned (possibly dimension or server switch).')
    waitingForWorldLoad = true

    // Delay to allow world chunks/entities to load
    setTimeout(() => {
      console.log('✅ World load complete.')
      waitingForWorldLoad = false
    }, 3000)
  })

  // Handle forced teleport
  bot.on('teleport', () => {
    console.log('🌀 Teleported.')
    waitingForWorldLoad = true
    setTimeout(() => {
      console.log('✅ Teleport complete.')
      waitingForWorldLoad = false
    }, 3000)
  })

  function safeGoToB2C() {
    const target = bot.players['B2C']?.entity
    if (!target) {
      console.log('❌ Player B2C not found.')
      return
    }

    const mcData = mcDataLoader(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const pos = target.position
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 1)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      console.log(`🎯 Reached B2C at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
      bot.pathfinder.setGoal(null)
      console.log('😴 Bot is now idle and staying connected.')
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
