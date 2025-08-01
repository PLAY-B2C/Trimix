const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')
const Vec3 = require('vec3').Vec3

let rightClickIntervals = {}
const botQueue = ['DrakonTide', 'Supreme_Bolt']
let currentTurn = 0
let isProcessingTurn = false

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
        if (username === botQueue[currentTurn] && !isProcessingTurn) {
          isProcessingTurn = true
          console.log(`🏃 ${username} starting dungeon interaction.`)
          goToAndClickNPC(bot, () => {
            walkBackwards(bot, () => {
              console.log(`✅ ${username} finished turn.`)
              currentTurn++
              isProcessingTurn = false
            })
          })
        }
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

    function goToAndClickNPC(bot, done) {
      const npc = bot.nearestEntity(e =>
        e.type === 'player' && e.username === '§e§lCLICK'
      )

      if (!npc) {
        console.log(`❌ ${bot.username} no NPC named '§e§lCLICK' found.`)
        return done()
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
              console.log(`❌ ${bot.username} no red pane or \"Not Ready\" found.`)
            }

            bot.pathfinder.setGoal(null)
            setTimeout(() => done(), 500)
          })
        }, 1000)
      })
    }

    function walkBackwards(bot, callback) {
      const npc = bot.nearestEntity(e =>
        e.type === 'player' &&
        e.username === '§e§lCLICK'
      )

      if (!npc) {
        console.log(`❌ ${bot.username} cannot walk backward: NPC not found.`)
        return callback()
      }

      const start = bot.entity.position.clone()
      const dx = npc.position.x - start.x
      const dz = npc.position.z - start.z
      const yaw = Math.atan2(-dx, -dz)

      bot.look(yaw, 0, true)

      const backwardVec = new Vec3(
        -Math.sin(yaw) * 9,
        0,
        -Math.cos(yaw) * 9
      )

      const target = start.plus(backwardVec)
      const goal = new goals.GoalNear(target.x, target.y, target.z, 1)

      bot.pathfinder.setGoal(goal)
      bot.once('goal_reached', () => {
        console.log(`🚶 ${bot.username} walked backward 9 blocks while facing NPC.`)
        callback()
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

// Launch bots
createBot({ username: 'DrakonTide', password: '3043AA', delay: 0 })
createBot({ username: 'Supreme_Bolt', password: '2151220', delay: 5000 })
