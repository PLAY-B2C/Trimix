const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const minecraftData = require('minecraft-data')

// === CONFIG ===
const BOT_CONFIG = {
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  auth: 'offline'
}

const NPC_COORDS = { x: 0, y: 64, z: 0 } // ⚠️ Replace with actual NPC coordinates
let alreadyTriggered = false

let bot

function createBot() {
  bot = mineflayer.createBot(BOT_CONFIG)
  bot.loadPlugin(pathfinder)

  bot.on('spawn', () => {
    console.log('✅ Bot spawned at', bot.entity.position)
    bot.chat('/login 3043AA')

    // Scan for NPCs after a few seconds
    setTimeout(() => {
      logNearbyNPCs()

      // Continue scanning every 5 seconds
      setInterval(() => {
        logNearbyNPCs()
      }, 5000)
    }, 3000)
  })

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('⚠️ Login failed, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (!alreadyTriggered && msg.includes('is holding')) {
      alreadyTriggered = true
      console.log('📣 "is holding" detected — starting interaction...')
      moveToNPCAndActivate()
    }
  })

  function moveToNPCAndActivate() {
    const mcData = minecraftData(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const goal = new goals.GoalNear(NPC_COORDS.x, NPC_COORDS.y, NPC_COORDS.z, 1)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      console.log(`🎯 Reached NPC at (${NPC_COORDS.x}, ${NPC_COORDS.y}, ${NPC_COORDS.z})`)
      bot.setQuickBarSlot(4) // Select slot 4 (index 4)
      bot.activateItem()
      console.log('🧪 Activated item in slot 4')
    })
  }

  bot.on('windowOpen', (window) => {
    console.log('📦 GUI opened:', window.title)
    if (window.slots.length === 54) {
      shiftClickRedGlass(window)
    } else {
      console.log('🟥 Not a double chest — skipping.')
    }
  })

  function shiftClickRedGlass(window) {
    let clicked = false
    for (let i = 0; i < window.slots.length; i++) {
      const item = window.slots[i]
      if (
        item &&
        (item.name === 'red_stained_glass_pane' ||
          (item.name === 'stained_glass_pane' && item.metadata === 14))
      ) {
        bot.clickWindow(i, 0, 1) // Shift-click
        console.log(`✅ Shift-clicked red glass pane at slot ${i}`)
        clicked = true
      }
    }

    if (!clicked) {
      console.log('⚠️ No red glass panes found.')
    }

    console.log('😴 Done interacting. Bot is now AFK.')
    bot.pathfinder.setGoal(null)
  }

  function logNearbyNPCs() {
    const entities = Object.values(bot.entities)
    const nearbyNPCs = entities.filter(entity =>
      entity.type === 'mob' &&
      entity.displayName &&
      !entity.username
    )

    if (nearbyNPCs.length === 0) {
      console.log('👻 No NPCs found nearby.')
    } else {
      console.log('🧍 Nearby NPCs:')
      nearbyNPCs.forEach(npc => {
        const pos = npc.position
        console.log(`- ${npc.displayName} at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
      })
    }
  }

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked from server:', reason)
    reconnectBot()
  })

  bot.on('error', (err) => {
    console.log('💥 Error:', err.stack)
  })

  bot.on('path_update', (results) => {
    console.log('📍 Path update:', results.status)
  })
}

function reconnectBot() {
  console.log('🔄 Reconnecting in 5 seconds...')
  setTimeout(() => {
    if (bot) bot.end()
    createBot()
  }, 5000)
}

createBot()
