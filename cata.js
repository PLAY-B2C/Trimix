const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const minecraftData = require('minecraft-data')

const BOT_CONFIG = {
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  auth: 'offline'
}

// Change this to the actual NPC location you want the bot to walk to
const NPC_COORDS = { x: 0, y: 64, z: 0 }

let bot

function createBot() {
  bot = mineflayer.createBot(BOT_CONFIG)
  bot.loadPlugin(pathfinder)

  bot.on('spawn', () => {
    console.log('Bot has spawned!')
    bot.chat('/login 3043AA')
  })

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('Login failed, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (msg.includes('is holding')) {
      console.log('"is holding" detected in chat, walking to NPC...')
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
      console.log(`Reached NPC at ${NPC_COORDS.x}, ${NPC_COORDS.y}, ${NPC_COORDS.z}`)
      activateItemNow()
    })
  }

  function activateItemNow() {
    bot.setQuickBarSlot(4) // slot index 4 = 5th slot
    bot.activateItem()
    console.log('Activated item in slot 4')
  }

  bot.on('windowOpen', (window) => {
    console.log('Window opened:', window.title)

    if (window.slots.length === 54) {
      shiftClickRedGlass(window)
    } else {
      console.log('Not a double chest, ignoring')
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
        bot.clickWindow(i, 0, 1) // mode 1 = shift-click
        console.log(`Shift-clicked red glass pane at slot ${i}`)
        clicked = true
      }
    }

    if (!clicked) {
      console.log('No red glass panes found')
    }

    console.log('Done. Bot is now AFK.')
    bot.pathfinder.setGoal(null) // Stop movement if still active
  }

  bot.on('kicked', (reason) => {
    console.log('Kicked:', reason)
    reconnectBot()
  })

  bot.on('error', (err) => {
    console.log('Error:', err.stack)
  })

  bot.on('path_update', (results) => {
    console.log('Path update:', results.status)
  })
}

function reconnectBot() {
  console.log('Reconnecting in 5 seconds...')
  setTimeout(() => {
    if (bot) bot.end()
    createBot()
  }, 5000)
}

createBot()
