const bedrock = require('bedrock-protocol');

// ===== CONFIGURATION =====
const CONFIG = {
  host: 'ABCD9190.aternos.me', // Replace with your Termux device local IP
  port: 53746,
  username: 'BotMiner',
  offline: true,
  version: '1.21.100',
  timeout: 24 * 60 * 60 * 1000, // 24 hours
  mineInterval: 3000 // ms between each block mining attempt
};

// ===== BOT START FUNCTION =====
function startBot() {
  console.log(`🔌 Connecting to ${CONFIG.host}:${CONFIG.port}...`);

  const client = bedrock.createClient({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    offline: CONFIG.offline,
    version: CONFIG.version,
    timeout: CONFIG.timeout
  });

  // ===== JOIN EVENT =====
  client.on('join', () => {
    console.log('✅ Bot joined the server!');

    // Start automatic block mining loop
    setInterval(() => mineBlock(client), CONFIG.mineInterval);
  });

  // ===== AUTOMATIC BLOCK MINING =====
  function mineBlock(bot) {
    const pos = { x: 0, y: 0, z: 1 }; // relative block in front of bot
    console.log(`🪓 Mining block at ${JSON.stringify(pos)}...`);

    // Start breaking
    bot.queue('player_action', {
      action: 'start_break',
      position: pos,
      face: 1
    });

    // Stop breaking after 2 seconds
    setTimeout(() => {
      bot.queue('player_action', {
        action: 'stop_break',
        position: pos,
        face: 1
      });
      console.log('✅ Block broken (if present).');
    }, 2000);
  }

  // ===== CHAT LOGGING =====
  client.on('text', (packet) => {
    console.log(`[CHAT] ${packet.message}`);
  });

  // ===== DISCONNECT HANDLING =====
  client.on('disconnect', (reason) => {
    console.log(`❌ Disconnected: ${reason}`);
    console.log('🔁 Reconnecting in 5 seconds...');
    setTimeout(startBot, 5000);
  });

  // ===== ERROR HANDLING =====
  client.on('error', (err) => {
    console.log(`❌ Connection error: ${err.message}`);
    console.log('🔁 Retrying in 5 seconds...');
    setTimeout(() => {
      client.close();
      startBot();
    }, 5000);
  });
}

// ===== START THE BOT =====
startBot();
