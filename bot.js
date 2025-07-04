const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder

let afkJump, clickFish, checkInv

function createBot() {
  const bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
    auth: 'offline',
    version: '1.21.4'
  })

  bot.loadPlugin(pathfinder)

  bot.on('spawn', async () => {
    bot.chat('/login 3043AA')
    await bot.waitForTicks(40)
    equipRod(bot)
    startFishingLoop(bot)
    startAfkJump(bot)
    monitorHunger(bot)
    monitorInventory(bot)
    setupCatchLogging(bot)
  })

  bot.on('end', () => {
    clearInterval(afkJump)
    clearInterval(clickFish)
    clearInterval(checkInv)
    setTimeout(createBot, 5000)
  })
}

function equipRod(bot) {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'))
  if (rod) bot.equip(rod, 'hand').catch(console.log)
}

function startFishingLoop(bot) {
  clickFish = setInterval(() => bot.activateItem(), 300)
}

function startAfkJump(bot) {
  afkJump = setInterval(() => {
    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 300)
  }, 60000)
}

function monitorHunger(bot) {
  setInterval(async () => {
    if (bot.food < 18) {
      const barrel = bot.findBlock({
        matching: block => block.name.includes('barrel'),
        maxDistance: 6
      })
      if (!barrel) return
      try {
        const container = await bot.openContainer(barrel)
        const bread = container.containerItems().find(i => i.name === 'bread')
        if (bread) {
          await container.withdraw(bread.type, null, 1)
          await bot.waitForTicks(5)
          const slot9 = 8
          await bot.moveSlotItem(bread.slot, slot9)
          bot.chat('🍞 Eating bread...')
          bot.look(bot.entity.yaw, -Math.PI / 2, true)
          await bot.equip(bot.inventory.slots[slot9 + 36], 'hand')
          await bot.consume()
        }
        container.close()
      } catch (err) { console.log('❌ Barrel error:', err) }
    }
  }, 5000)
}

function monitorInventory(bot) {
  checkInv = setInterval(async () => {
    if (!bot.inventory.emptySlotCount()) {
      const chests = bot.findBlocks({
        matching: b => b.name.includes('chest') && !b.name.includes('barrel'),
        maxDistance: 6,
        count: 3
      })
      for (const pos of chests) {
        const chestBlock = bot.blockAt(pos)
        try {
          const chest = await bot.openContainer(chestBlock)
          for (let item of bot.inventory.items()) {
            if (item.name !== 'bread') {
              await chest.deposit(item.type, null, item.count)
              bot.chat(`📦 Stored: ${item.name}`)
            }
          }
          chest.close()
          break
        } catch (err) { console.log('❌ Chest error:', err) }
      }
    }
  }, 8000)
}

function setupCatchLogging(bot) {
  bot.on('playerCollect', (collector, item) => {
    if (collector.username === bot.username) {
      const name = item?.metadata?.[7]?.value || item.name
      bot.chat(`🎣 Caught: ${item.displayName || name}`)
    }
  })
}

createBot()
