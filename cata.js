const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')
const Vec3 = require('vec3').Vec3

let rightClickIntervals = {}
let teleportingStatus = {}
let dungeonStarted = false
const knownBotNames = ['DrakonTide', 'Supreme_Bolt', 'JamaaLcaliph', 'B2C', 'BoltMC']
const botTurnQueue = [...knownBotNames]
const bots = {}

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
    bots[username] = bot

    bot.once('spawn', () => {
      console.log(`✅ ${username} spawned.`)
      bot.chat(`/login ${password}`)
    })

    bot.on('message', async (message) => {
      const msg = message.toString().toLowerCase()

      if (msg.includes('login failed') || msg.includes('please login')) {
        console.log(`🔐 ${username} login retry...`)
        setTimeout(() => bot.chat(`/login ${password}`), 2000)
      }

      if (msg.includes('sending to sb')) {
        teleportingStatus[username] = true
        try { bot.pathfinder.setGoal(null) } catch {}
        stopRightClickSpam(bot)
        if (bot.currentWindow) try { bot.closeWindow(bot.currentWindow) } catch {}
        bot.removeAllListeners('windowOpen')
        setTimeout(() => teleportingStatus[username] = false, 5000)
      }

      if (msg.includes('the dungeon will begin') && !dungeonStarted) {
        dungeonStarted = true
        runNextBotInQueue()
      }

      if (msg.includes('i first entered the dungeon')) {
        console.log(`🔁 ${username} start spamming right-click.`)
        startRightClickSpam(bot)
      }

      if (msg.includes('you have dealt')) {
        stopRightClickSpam(bot)
        startKeepAlive(bot)
      }
    })

    bot.on('kicked', (reason) => console.log(`❌ ${username} was kicked:`, reason))
    bot.on('error', (err) => console.log(`💥 ${username} error:`, err.message))
    bot.on('end', () => {
      console.log(`🔌 ${username} disconnected. Reconnecting in 5s...`)
      clearInterval(rightClickIntervals[username])
      setTimeout(() => createBot({ username, password, delay: 0 }), 5000)
    })

    function goToAndClickNPCAndBack(bot, callback) {
      const npc = bot.nearestEntity(e =>
        e.type === 'player' &&
        e.username === '§e§lCLICK'
      )

      if (!npc) return console.log(`❌ ${bot.username} no valid NPC found.`)

      const mcData = mcDataLoader(bot.version)
      const movements = new Movements(bot, mcData)
      bot.pathfinder.setMovements(movements)

      const pos = npc.position
      bot.lookAt(pos.offset(0, 1.6, 0))
      bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1))

      bot.once('goal_reached', () => {
        bot.lookAt(pos.offset(0, 1.6, 0))
        bot.setQuickBarSlot(0)
        setTimeout(() => {
          bot.attack(npc)
          console.log(`🖱️ ${bot.username} left-clicked NPC`)

          bot.once('windowOpen', (window) => {
            let clickedAny = false
            for (let i = 0; i < window.slots.length; i++) {
              const item = window.slots[i]
              if (
                item &&
                (item.name === 'red_stained_glass_pane' ||
                  (item.name === 'stained_glass_pane' && item.metadata === 14) ||
                  item.displayName?.toLowerCase().includes('not ready'))
              ) {
                bot.clickWindow(i, 0, 1)
                clickedAny = true
                console.log(`✅ ${bot.username} clicked ${item.displayName}`)
                break
              }
            }
            if (!clickedAny) {
              console.log(`❌ ${bot.username} found no red pane or 'Not Ready'.`)
            }
            walkBackwards(bot, npc.position, callback)
          })
        }, 1000)
      })
    }

    function walkBackwards(bot, npcPos, callback) {
      const direction = bot.entity.position.minus(npcPos).normalize().scale(9)
      const target = bot.entity.position.plus(direction)

      bot.lookAt(npcPos.offset(0, 1.6, 0))
      bot.setControlState('back', true)

      const interval = setInterval(() => {
        bot.lookAt(npcPos.offset(0, 1.6, 0))
        const dist = bot.entity.position.distanceTo(target)
        if (dist <= 0.7) {
          bot.setControlState('back', false)
          clearInterval(interval)
          console.log(`🏁 ${bot.username} walked back 9 blocks.`)
          if (callback) callback()
        }
      }, 250)
    }

    function startRightClickSpam(bot) {
      if (rightClickIntervals[bot.username] || teleportingStatus[bot.username]) return
      bot.setQuickBarSlot(0)
      rightClickIntervals[bot.username] = setInterval(() => bot.activateItem(), 300)
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

function runNextBotInQueue() {
  if (botTurnQueue.length === 0) return
  const botName = botTurnQueue.shift()
  const bot = bots[botName]
  if (!bot) return

  goToAndClickNPCAndBack(bot, () => {
    setTimeout(runNextBotInQueue, 1000)
  })

  function goToAndClickNPCAndBack(bot, callback) {
    const npc = bot.nearestEntity(e => e.type === 'player' && e.username === '§e§lCLICK')
    if (!npc) return console.log(`❌ ${bot.username} couldn't find NPC.`)

    const mcData = mcDataLoader(bot.version)
    bot.pathfinder.setMovements(new Movements(bot, mcData))
    const pos = npc.position

    bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1))
    bot.once('goal_reached', () => {
      bot.lookAt(pos.offset(0, 1.6, 0))
      bot.attack(npc)
      bot.once('windowOpen', (window) => {
        for (let i = 0; i < window.slots.length; i++) {
          const item = window.slots[i]
          if (
            item &&
            (item.name === 'red_stained_glass_pane' ||
              (item.name === 'stained_glass_pane' && item.metadata === 14) ||
              item.displayName?.toLowerCase().includes('not ready'))
          ) {
            bot.clickWindow(i, 0, 1)
            break
          }
        }
        walkBackwards(bot, pos, callback)
      })
    })

    function walkBackwards(bot, npcPos, callback) {
      const direction = bot.entity.position.minus(npcPos).normalize().scale(9)
      const target = bot.entity.position.plus(direction)

      bot.lookAt(npcPos.offset(0, 1.6, 0))
      bot.setControlState('back', true)

      const interval = setInterval(() => {
        bot.lookAt(npcPos.offset(0, 1.6, 0))
        const dist = bot.entity.position.distanceTo(target)
        if (dist <= 0.7) {
          bot.setControlState('back', false)
          clearInterval(interval)
          if (callback) callback()
        }
      }, 250)
    }
  }
}

// Launch bots
createBot({ username: 'DrakonTide', password: '3043AA', delay: 0 })
createBot({ username: 'Supreme_Bolt', password: '2151220', delay: 5000 })
// You can add others too like:
// createBot({ username: 'JamaaLcaliph', password: '7860AA', delay: 10000 })
