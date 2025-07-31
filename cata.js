const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

// Bot configuration
const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  auth: 'offline' // Offline mode for cracked server
})

// NPC coordinates (replace with actual coordinates from mc.fakepixel.fun)
const NPC_COORDS = { x: 0, y: 64, z: 0 } // Example: x, y, z

// Load pathfinder plugin
bot.loadPlugin(pathfinder)

// Log when bot spawns and attempt login
bot.on('spawn', () => {
  console.log('Bot has spawned in the server!')
  // Send login command
  bot.chat('/login 3043AA')
  // Move to NPC coordinates after a short delay to ensure login completes
  setTimeout(() => moveToNPC(), 3000)
})

// Handle login failure
bot.on('message', (message) => {
  const msg = message.toString()
  if (msg.includes('login failed') || msg.includes('please login')) {
    console.log('Login failed, retrying...')
    setTimeout(() => bot.chat('/login 3043AA'), 2000) // Retry after 2 seconds
  }
})

// Function to move to NPC coordinates
function moveToNPC() {
  const mcData = require('minecraft-data')(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const goal = new goals.GoalNear(NPC_COORDS.x, NPC_COORDS.y, NPC_COORDS.z, 1) // Stop within 1 block
  bot.pathfinder.setGoal(goal)

  // When close to NPC, perform actions
  bot.once('goal_reached', () => {
    console.log(`Reached NPC at ${NPC_COORDS.x}, ${NPC_COORDS.y}, ${NPC_COORDS.z}`)
    // Select hotbar slot 7 (index 7)
    bot.setQuickBarSlot(7)
    // Activate item
    bot.activateItem()
  })
}

// Handle window opening for GUI interaction
bot.on('windowOpen', (window) => {
  console.log('Window opened:', window.type)
  // Check if window is a double chest (54 slots)
  if (window.slots.length === 54) {
    clickRedGlassPanes(window)
  } else {
    console.log('Not a double chest, ignoring')
  }
})

// Function to click red glass panes in the double chest
function clickRedGlassPanes(window) {
  let clicked = false
  for (let i = 0; i < window.slots.length; i++) {
    const item = window.slots[i]
    // Check for red stained glass pane (1.13+ ID or 1.12- metadata)
    if (item && (item.name === 'red_stained_glass_pane' || (item.name === 'stained_glass_pane' && item.metadata === 14))) {
      bot.clickWindow(i, 0, 0) // Click the slot
      console.log(`Clicked red glass pane at slot ${i}`)
      clicked = true
    }
  }

  if (!clicked) {
    console.log('No red glass panes found in window')
  }

  // Stop moving and AFK
  bot.pathfinder.setGoal(null)
  console.log('Bot is now AFK')
})

// Log errors and kick reasons
bot.on('kicked', (reason) => {
  console.log('Kicked:', reason)
  // Attempt to reconnect after 5 seconds
  setTimeout(() => {
    console.log('Attempting to reconnect...')
    bot.end()
    bot.connect()
  }, 5000)
})

bot.on('error', (err) => {
  console.log('Error:', err.stack)
})

// Debug pathfinding issues
bot.on('path_update', (results) => {
  console.log('Path update:', results.status)
})
