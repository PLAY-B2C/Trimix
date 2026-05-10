const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

let rightClickIntervals = {}
let teleportingStatus = {}

function createBot({ username, password, delay }) {
  setTimeout(() => {
    const bot = mineflayer.createBot({
      host: 'mc.fakepixel.fun',
      port: 25565,
      username,
      auth: 'offline',
      version: '1.16.5',
      checkTimeoutInterval: 120000
    })

    bot.loadPlugin(pathfinder)
    teleportingStatus[username] = false

    bot.once('spawn', () => {
      console.log(`✅ ${username} spawned.`)
      bot.chat(`/login ${password}`)
    })

    bot.on('message', (message) => {
      const msg = message.toString().toLowerCase()

      if (msg.includes('login failed') || msg.includes('please login')) {
        console.log(`🔐 ${username} login retry...`)
        setTimeout(() => bot.chat(`/login ${password}`), 2000)
      }

      if (msg.includes('sending to sb')) {
        console.log(`🚪 ${username} preparing for teleport.`)
        teleportingStatus[username] = true

        try { bot.pathfinder.setGoal(null) } catch {}
        stopRightClickSpam(bot)
        if (bot.currentWindow) {
          try { bot.closeWindow(bot.currentWindow) } catch {}
        }
        bot.removeAllListeners('windowOpen')

        setTimeout(() => {
          teleportingStatus[username] = false
          console.log(`🔄 ${username} teleport completed.`)
        }, 5000)
      }

      if (msg.includes('Dungeon starts in') && !teleportingStatus[username]) {
        console.log(`🔁 ${username} start spamming right-click.`)
        startRightClickSpam(bot)
      }

      if (msg.includes('you have dealt')) {
        console.log(`😴 ${username} going AFK.`)
        stopRightClickSpam(bot)
        startKeepAlive(bot)
      }
    })

    bot.on('windowOpen', (window) => {
      try {
        console.log(`📦 ${bot.username} GUI opened:`, window.title)
      } catch (e) {
        console.warn(`⚠️ ${bot.username} GUI open error:`, e.message)
      }
    })

    bot.on('kicked', (reason) => {
      console.log(`❌ ${username} was kicked:`, reason)
    })

    bot.on('error', (err) => {
      console.log(`💥 ${username} error:`, err.message)
    })

    bot.on('end', () => {
      console.log(`🔌 ${username} disconnected. Reconnecting in 5s...`)
      clearInterval(rightClickIntervals[username])
      setTimeout(() => createBot({ username, password, delay: 0 }), 5000)
    })

    function startRightClickSpam(bot) {
      if (rightClickIntervals[bot.username] || teleportingStatus[bot.username]) return
      bot.setQuickBarSlot(0)
      rightClickIntervals[bot.username] = setInterval(() => {
        bot.activateItem()
      }, 300)
    }

    function stopRightClickSpam(bot) {
      if (rightClickIntervals[bot.username]) {
        clearInterval(rightClickIntervals[bot.username])
        delete rightClickIntervals[bot.username]
      }
    }

    function startKeepAlive(bot) {
      setInterval(() => {
        if (bot && bot.player) {
          bot._client.write('ping', { keepAliveId: Date.now() })
          console.log(`📶 ${bot.username} keep-alive ping sent.`)
        }
      }, 30000)
    }

  }, delay)
}

process.on('uncaughtException', (err) => {
  console.error('🛑 Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 Unhandled Promise:', reason)
})

createBot({ username: 'DrakonTide', password: '3043AA', delay: 0 })
