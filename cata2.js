const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

let rightClickIntervals = {}

const knownBotNames = ['DrakonTide', 'Supreme_Bolt', 'JamaaLcaliph']

function createBot({ username, password, delay }) {
  setTimeout(() => {
    const bot = mineflayer.createBot({
      host: 'mc.fakepixel.fun',
      port: 25565,
      username,
      auth: 'offline',
      checkTimeoutInterval: 120000
    })

    bot.loadPlugin(pathfinder)

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

      if (msg.includes('the dungeon will begin')) {
        console.log(`🏃 ${username} moving to NPC.`)
        goToAndClickNPC(bot)
      }

      if (msg.includes('this dungeon will close in')) {
        console.log(`⛔ ${username} quitting (dungeon closing).`)
        bot.quit('Dungeon closing')
      }

      if (msg.includes('i first entered the dungeon')) {
        console.log(`🔁 ${username} start spamming right-click.`)
        startRightClickSpam(bot)
      }

      if (msg.includes('you have dealt')) {
        console.log(`😴 ${username} going AFK.`)
        stopRightClickSpam(bot)
        startKeepAlive(bot)
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
      setTimeout(() => createBot({ username, password, delay: 0 }), 5000)
    })

    function goToAndClickNPC(bot) {
      const npc = bot.nearestEntity(e =>
        e.type === 'player' &&
        e.username !== bot.username &&
        !knownBotNames.includes(e.username)
      )

      if (!npc) {
        console.log(`❌ ${bot.username} no NPC found.`)
        return
      }

      const mcData = mcDataLoader(bot.version)
      const movements = new Movements(bot, mcData)
      bot.pathfinder.setMovements(movements)

      const pos = npc.position
      const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 0.3)
      bot.pathfinder.setGoal(goal)

      bot.once('goal_reached', () => {
        console.log(`🎯 ${bot.username} reached NPC at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
        bot.setQuickBarSlot(0)

        setTimeout(() => {
          bot.attack(npc)
          console.log(`🖱️ ${bot.username} left-clicked NPC`)

          bot.once('windowOpen', (window) => {
            console.log(`📦 ${bot.username} GUI opened:`, window.title)
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
                bot.clickWindow(i, 0, 1)
                console.log(`✅ ${bot.username} shift-clicked: ${item.displayName || item.name}`)
                clickedAny = true
              }
            }

            if (!clickedAny) {
              console.log(`❌ ${bot.username} no red pane or "Not Ready" found.`)
            }

            bot.pathfinder.setGoal(null)
          })
        }, 1000)
      })
    }

    function startRightClickSpam(bot) {
      if (rightClickIntervals[bot.username]) return
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

    process.on('uncaughtException', (err) => {
      console.error('🛑 Uncaught Exception:', err)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🛑 Unhandled Promise:', reason)
    })
  }, delay)
}

// Launching all 3 bots with 5 sec delay
createBot({ username: 'DrakonTide', password: '3043AA', delay: 0 })
createBot({ username: 'Supreme_Bolt', password: '2151220', delay: 5000 })
