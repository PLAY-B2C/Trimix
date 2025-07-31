const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'JamaaLcaliph',
    auth: 'offline',
    checkTimeoutInterval: 60000, // Prevent timeout early
  })

  bot.loadPlugin(pathfinder)

  let waitingForWorldLoad = false
  let shouldGoToB2C = false

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
      console.log('📣 Detected "is holding" message.')

      if (waitingForWorldLoad) {
        console.log('⏳ Waiting for world to finish loading...')
        shouldGoToB2C = true
        return
      }

      goToB2C()
    }
  })

  // Delay movement on teleport or respawn
  bot.on('teleport', () => {
    console.log('🌀 Teleported. Waiting for chunks...')
    waitingForWorldLoad = true
    setTimeout(() => {
      console.log('✅ Teleport complete.')
      waitingForWorldLoad = false
      if (shouldGoToB2C) {
        shouldGoToB2C = false
        goToB2C()
      }
    }, 3000)
  })

  bot.on('respawn', () => {
    console.log('🌐 Respawned (possible server/dimension swap).')
    waitingForWorldLoad = true
    setTimeout(() => {
      console.log('✅ World load complete.')
      waitingForWorldLoad = false
      if (shouldGoToB2C) {
        shouldGoToB2C = false
        goToB2C()
      }
    }, 3000)
  })

  function goToB2C() {
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
      console.log('😴 Bot is now idle and staying alive.')
    })
  }

  // Reconnect logic
  bot.on('end', () => {
    console.log('🔌 Bot disconnected. Reconnecting in 5s...')
    setTimeout(createBot, 5000)
  })

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason)
  })

  bot.on('error', (err) => {
    console.log('💥 Error:', err.message)
  })

  return bot
}

createBot()
