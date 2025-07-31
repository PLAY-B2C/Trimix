const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const minecraftData = require('minecraft-data')

const bot = mineflayer.createBot({
  host: 'mc.fakepixel.fun',
  port: 25565,
  username: 'JamaaLcaliph',
  auth: 'offline'
})

bot.loadPlugin(pathfinder)

bot.on('spawn', () => {
  console.log('✅ Bot spawned.')
  bot.chat('/login 3043AA')
})

bot.on('message', (message) => {
  const msg = message.toString().toLowerCase()

  if (msg.includes('login failed') || msg.includes('please login')) {
    console.log('⚠️ Login failed, retrying...')
    setTimeout(() => bot.chat('/login 3043AA'), 2000)
  }

  if (msg.includes('is holding')) {
    console.log('📣 Detected "is holding" — starting task.')
    goToB2CAndActivate()
  }
})

function goToB2CAndActivate() {
  const target = Object.values(bot.players).find(p => p.username === 'B2C' && p.entity)
  if (!target) {
    console.log('❌ Player "B2C" not found or not in range.')
    return
  }

  const mcData = minecraftData(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const pos = target.entity.position
  const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 1)
  bot.pathfinder.setGoal(goal)

  bot.once('goal_reached', () => {
    console.log(`🎯 Reached B2C at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
    bot.setQuickBarSlot(4)
    bot.activateItem()
    console.log('🧪 Activated item in slot 4.')
  })
}

bot.on('windowOpen', (window) => {
  console.log('📦 GUI opened:', window.title)

  let clicked = false
  for (let i = 0; i < window.slots.length; i++) {
    const item = window.slots[i]
    if (
      item &&
      (item.name === 'red_stained_glass_pane' ||
       (item.name === 'stained_glass_pane' && item.metadata === 14))
    ) {
      bot.clickWindow(i, 0, 1) // shift-click
      console.log(`✅ Shift-clicked red glass pane at slot ${i}`)
      clicked = true
    }
  }

  if (!clicked) {
    console.log('🟥 No red glass panes found.')
  }

  bot.pathfinder.setGoal(null) // stop moving
  console.log('😴 Bot is now AFK. Sending keep-alive packets.')
})

// Reconnect logic (optional but safe)
bot.on('kicked', (reason) => {
  console.log('❌ Kicked:', reason)
})

bot.on('error', (err) => {
  console.log('💥 Error:', err.stack)
})
