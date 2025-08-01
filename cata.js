const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')
const { Vec3 } = require('vec3')

const knownBotNames = ['DrakonTide']
let rightClickIntervals = {}

function createBot(username, password, loginDelay = 0) {
  setTimeout(() => {
    const bot = mineflayer.createBot({
      host: 'mc.fakepixel.fun',
      port: 25565,
      username,
      version: '1.16.5'
    })

    bot.loadPlugin(pathfinder)

    bot.once('spawn', () => {
      console.log(`✅ ${username} spawned.`)
      const mcData = mcDataLoader(bot.version)
      bot.pathfinder.setMovements(new Movements(bot, mcData))
    })

    bot.on('chat', (msg) => {
      if (msg.includes('you have dealt')) {
        console.log(`😴 ${username} going AFK.`)
        stopRightClickSpam(bot)
        startKeepAlive(bot)
      }
    })

    bot.on('windowOpen', (window) => {
      clickRedGlassPanes(bot, window)
    })

    bot.on('physicTick', () => {
      const npc = findNearestNPC(bot)
      if (npc) {
        console.log(`🧍 ${bot.username} found NPC: ${npc.username}`)
        interactWithNPC(bot, npc)
      }
    })

    bot.on('end', () => {
      console.log(`🔁 ${username} disconnected. Reconnecting...`)
      createBot(username, password, 5000)
    })

    bot.on('kicked', (reason) => {
      console.log(`⛔ ${username} was kicked: ${reason}`)
    })
  }, loginDelay)
}

function findNearestNPC(bot) {
  return bot.nearestEntity(e =>
    e.type === 'player' &&
    e.username !== bot.username &&
    !knownBotNames.includes(e.username)
  )
}

function interactWithNPC(bot, npc) {
  if (rightClickIntervals[bot.username]) return
  bot.lookAt(npc.position.offset(0, 1.6, 0))
  bot.attack(npc)
  console.log(`👊 ${bot.username} left-clicked ${npc.username}`)

  setTimeout(() => {
    rightClickIntervals[bot.username] = setInterval(() => {
      bot.activateEntity(npc)
    }, 500)
    console.log(`🖱️ ${bot.username} started right-click spamming on ${npc.username}`)
  }, 1000)
}

function stopRightClickSpam(bot) {
  if (rightClickIntervals[bot.username]) {
    clearInterval(rightClickIntervals[bot.username])
    delete rightClickIntervals[bot.username]
  }
}

function clickRedGlassPanes(bot, window) {
  const redGlassSlots = window.slots
    .map((item, index) => ({ item, index }))
    .filter(s =>
      s.item &&
      s.item.name.includes('stained_glass_pane') &&
      s.item.displayName?.includes('Ready')
    )

  if (redGlassSlots.length === 0) {
    console.log(`🔴 ${bot.username}: No "Ready" red glass panes found.`)
    return
  }

  bot.clickWindow(redGlassSlots[0].index, 0, 1)
  console.log(`✅ ${bot.username} shift-clicked "${redGlassSlots[0].item.displayName}"`)

  setTimeout(() => {
    walkBackwards(bot)
  }, 1000)
}

function walkBackwards(bot) {
  const npc = findNearestNPC(bot)
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

function startKeepAlive(bot) {
  setInterval(() => {
    try {
      bot._client.write('keep_alive', { keepAliveId: BigInt(Date.now()) })
    } catch (e) {
      console.log(`💤 ${bot.username} failed keep-alive: ${e.message}`)
    }
  }, 15000)
}

// 🔐 Create bot with login delay of 0ms
createBot('DrakonTide', '3043AA', 0)
