const mineflayer = require('mineflayer')

const HOST = 'reserver.fakepixel.fun'
const PORT = 25565

// Bot usernames
const BOT_NAMES = [
  'hitpro1234',
  'rogouemc'
]

// Delay before reconnect (in ms)
const RECONNECT_DELAY = 5000

function createBot(username) {
  let bot
  let reconnectTimeout = null

  function start() {
    bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: username
    })

    bot.on('login', () => {
      console.log(`[${username}] Logged in.`)
    })

    bot.on('end', (reason) => {
      console.log(`[${username}] Disconnected: ${reason}`)
      scheduleReconnect()
    })

    bot.on('error', (err) => {
      console.log(`[${username}] Error: ${err.message}`)
    })
  }

  function scheduleReconnect() {
    if (reconnectTimeout) return // Prevent stacking reconnect timers
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      console.log(`[${username}] Reconnecting...`)
      start()
    }, RECONNECT_DELAY)
  }

  start()
}

// Start all bots
BOT_NAMES.forEach(name => {
  createBot(name)
})
