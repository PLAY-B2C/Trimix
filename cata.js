const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

const knownBotNames = ['DrakonTide']
let botQueue = []
let activeBot = null
let rightClickIntervals = {}
let teleportingStatus = {}

function createBot(username, password, delayMs) {
  setTimeout(() => {
    const bot = mineflayer.createBot({
      host: 'mc.fakepixel.fun',
      port: 25565,
      username,
    })

    const mcData = mcDataLoader('1.16.5')
    bot.loadPlugin(pathfinder)

    bot.once('spawn', () => {
      console.log(`✅ ${username} spawned.`)
      bot.chat(`/login ${password}`)
    })

    bot.on('chat', (msg) => {
      const lower = msg.toLowerCase()

      if (lower.includes('the dungeon will begin')) {
        const npc = findNPC(bot)
        if (npc) {
          console.log(`🔍 ${bot.username} found NPC: ${npc.username}`)
          if (!botQueue.includes(bot)) {
            botQueue.push(bot)
            if (!activeBot) runQueue()
          }
        }
      }

      if (lower.includes('i first entered the dungeon') && !teleportingStatus[username]) {
        console.log(`🔁 ${username} start spamming right-click.`)
        startRightClickSpam(bot)
      }

      if (lower.includes('you have dealt')) {
        console.log(`😴 ${username} going AFK.`)
        stopRightClickSpam(bot)
        startKeepAlive(bot)
      }
    })

    bot.on('end', () => {
      console.log(`❌ ${username} disconnected.`)
      if (rightClickIntervals[username]) {
        clearInterval(rightClickIntervals[username])
        delete rightClickIntervals[username]
      }
      if (botQueue.includes(bot)) {
        botQueue = botQueue.filter(b => b !== bot)
      }
      if (activeBot === bot) {
        activeBot = null
        runQueue()
      }
    })
  }, delayMs)
}

function runQueue() {
  if (botQueue.length === 0) return
  activeBot = botQueue.shift()
  console.log(`🤖 ${activeBot.username} is acting now.`)
  interactWithNPC(activeBot, () => {
    walkBackwards(activeBot)
    setTimeout(() => {
      activeBot = null
      runQueue()
    }, 5000)
  })
}

function findNPC(bot) {
  return bot.nearestEntity(e =>
    e.type === 'player' &&
    e.username !== bot.username &&
    !knownBotNames.includes(e.username) &&
    (!bot.players[e.username]?.ping || bot.players[e.username]?.ping === 0) &&
    e.velocity.x === 0 &&
    e.velocity.y === 0 &&
    e.velocity.z === 0
  )
}

function interactWithNPC(bot, callback) {
  const npc = findNPC(bot)
  if (!npc) {
    console.log(`⚠️ ${bot.username} could not find NPC to click.`)
    return
  }

  bot.attack(npc)
  setTimeout(() => {
    bot.once('windowOpen', (window) => {
      const redPane = window.slots.find(item => item && item.name.includes('glass') && item.displayName.toLowerCase().includes('ready'))
      if (redPane) {
        bot.clickWindow(redPane.slot, 0, 1)
        console.log(`🟥 ${bot.username} clicked ${redPane.displayName}`)
      } else {
        console.log(`⚠️ ${bot.username} found no red glass pane.`)
      }
      setTimeout(callback, 1000)
    })
    bot.activateEntity(npc)
  }, 1000)
}

function walkBackwards(bot) {
  const npc = findNPC(bot)
  if (!npc) {
    console.log(`⚠️ ${bot.username} cannot walk back: NPC missing.`)
    return
  }

  const mcData = mcDataLoader(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const pos = bot.entity.position
  const yaw = bot.entity.yaw
  const dx = -9 * Math.sin(yaw)
  const dz = -9 * Math.cos(yaw)
  const backPos = pos.offset(dx, 0, dz)
  const goal = new goals.GoalBlock(backPos.x, backPos.y, backPos.z)

  bot.lookAt(npc.position.offset(0, 1.6, 0))
  bot.pathfinder.setGoal(goal)
  console.log(`↩️ ${bot.username} walking backwards 9 blocks while facing NPC.`)
}

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
    bot._client.write('keep_alive', { keepAliveId: BigInt(Date.now()) })
  }, 15000)
}

// 🟢 Create single bot with delay
createBot('DrakonTide', '3043AA', 0)
