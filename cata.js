const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

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

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (msg.includes('is holding')) {
      console.log('📣 Detected "is holding" — starting movement.')
      goToB2C()
    }
  })

  function goToB2C() {
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
      bot.pathfinder.setGoal(null) // Stop moving
      console.log('😴 Bot is now idle and keeping connection alive.')
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
