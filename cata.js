const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

// Bot configuration
const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  auth: 'offline'
})

// NPC coordinates (replace with actual coordinates from mc.fakepixel.fun)
const NPC_COORDS = { x: 0, y: 64, z: 0 }

// Load pathfinder plugin
bot.loadPlugin(pathfinder)

// Log spawn and attempt login
bot.on('spawn', () => {
  console.log('Bot spawned')
  bot.chat('/login 3043AA')
  setTimeout(() => moveToNPC(), 3000)
})

// Handle login failure
bot.on('message', (message) => {
  const msg = message.toString()
  if (msg.includes('login failed') || msg.includes('please login')) {
    console.log('Login failed, retrying...')
    setTimeout(() => bot.chat('/login 3043AA'), 2000)
  }
})

// Move to NPC coordinates
function moveToNPC() {
  const mcData = require('minecraft-data')(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)
  const goal = new goals.GoalNear(NPC_COORDS.x, NPC_COORDS.y, NPC_COORDS.z, 1)
  bot.pathfinder.setGoal(goal)

  bot.once('goal_reached', () => {
    console.log(`Reached NPC at ${NPC_COORDS.x}, ${NPC_COORDS.y}, ${NPC_COORDS.z}`)
    bot.setQuickBarSlot(7)
    bot.activateItem()
  })
}

// Handle GUI interaction
bot.on('windowOpen', (window) => {
  console.log('Window opened:', window.type)
  if (window.slots.length === 54) {
    clickRedGlassPanes(window)
  } else {
    console.log('Not a double chest')
  }
})

// Click red glass panes
function clickRedGlassPanes(window) {
  let clicked = false
  for (let i = 0; i < window.slots.length; i++) {
    const item = window.slots[i]
    if (item && (item.name === 'red_stained_glass_pane' || (item.name === 'stained_glass_pane' && item.metadata === 14))) {
      bot.clickWindow(i, 0, 0)
      console.log(`Clicked red glass pane at slot ${i}`)
      clicked = true
    }
  }
  if (!clicked) console.log('No red glass panes found')
  bot.pathfinder.setGoal(null)
  console.log('Bot AFK')
})

// Handle kicks and errors
bot.on('kicked', (reason) => {
  console.log('Kicked:', reason)
  setTimeout(() => {
    console.log('Reconnecting...')
    bot.end()
    bot.connect()
  }, 5000)
})

bot.on('error', (err) => console.log('Error:', err.stack))
bot.on('path_update', (results) => console.log('Path update:', results.status))
