const mineflayer = require('mineflayer')

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  host: 'reserver.fakepixel.fun',
  port: 25565,
  reconnectDelay: 5000,      // ms before reconnect attempt
  maxReconnectDelay: 60000,  // cap for exponential backoff
  version: false,            // set to e.g. '1.8.9' if needed
}

const BOT_NAMES = [
  'PookiePrincessRl',
  'Drogenking_123',
]

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(username, level, msg) {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const levels = { info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' }
  const color = levels[level] ?? ''
  console.log(`${color}[${time}] [${username}] [${level.toUpperCase()}] ${msg}${levels.reset}`)
}

// ─── Bot Factory ──────────────────────────────────────────────────────────────
function createBot(username) {
  let bot = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let isDestroyed = false

  function getBackoffDelay() {
    // Exponential backoff with jitter, capped at maxReconnectDelay
    const base = CONFIG.reconnectDelay * Math.pow(1.5, Math.min(reconnectAttempts, 10))
    const jitter = Math.random() * 1000
    return Math.min(base + jitter, CONFIG.maxReconnectDelay)
  }

  function scheduleReconnect() {
    if (reconnectTimer || isDestroyed) return
    const delay = getBackoffDelay()
    reconnectAttempts++
    log(username, 'warn', `Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt #${reconnectAttempts})...`)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    if (isDestroyed) return

    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username,
      ...(CONFIG.version && { version: CONFIG.version }),
    })

    // ── Events ──────────────────────────────────────────────────────────────

    bot.once('login', () => {
      reconnectAttempts = 0 // reset backoff on successful login
      log(username, 'info', `Logged in to ${CONFIG.host}:${CONFIG.port}`)
    })

    bot.on('spawn', () => {
      log(username, 'info', 'Spawned in world')
    })

    bot.on('kicked', (reason) => {
      let readable = reason
      try { readable = JSON.parse(reason)?.text ?? reason } catch {}
      log(username, 'warn', `Kicked: ${readable}`)
    })

    bot.on('end', (reason) => {
      log(username, 'warn', `Disconnected: ${reason}`)
      bot.removeAllListeners()
      bot = null
      scheduleReconnect()
    })

    bot.on('error', (err) => {
      log(username, 'error', `${err.message}`)
      // 'end' will fire after an error, so no reconnect needed here
    })

    bot.on('chat', (sender, message) => {
      if (sender === username) return
      log(username, 'info', `<${sender}> ${message}`)
    })
  }

  // Public API
  function destroy() {
    isDestroyed = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (bot) { bot.quit('Shutting down'); bot = null }
    log(username, 'info', 'Bot destroyed.')
  }

  connect()
  return { username, destroy }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const bots = BOT_NAMES.map(name => createBot(name))

// Graceful shutdown on CTRL+C
process.on('SIGINT', () => {
  console.log('\nShutting down all bots...')
  bots.forEach(b => b.destroy())
  setTimeout(() => process.exit(0), 1500)
})
