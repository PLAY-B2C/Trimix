const bedrock = require('bedrock-protocol');

// 24 hours in milliseconds
const TIMEOUT_MS = 24 * 60 * 60 * 1000;

function startBot() {
  const client = bedrock.createClient({
    host: 'play.craftersmc.net',   // server IP or domain
    port: 19132,                    // default Bedrock port
    username: 'OGplay4er22990',     // bot username
    offline: true,                  // set false if using Xbox login
    version: '1.21.100',            // Minecraft Bedrock version
    timeout: TIMEOUT_MS
  });

  client.on('join', () => {
    console.log('✅ Bot joined the server!');
    // Example: try to break a block in front of the bot after 3 seconds
    setTimeout(() => {
      chopBlock({ x: 0, y: 0, z: 1 });
    }, 3000);
  });

  // Function to send "start break" and "stop break" packets
  function chopBlock(position) {
    console.log('🪓 Trying to chop block at', position);

    client.queue('player_action', {
      action: 'start_break',
      position: position,
      face: 1
    });

    setTimeout(() => {
      client.queue('player_action', {
        action: 'stop_break',
        position: position,
        face: 1
      });
      console.log('✅ Block broken (if it was a log).');
    }, 2000);
  }

  client.on('text', (packet) => {
    console.log(`[CHAT] ${packet.message}`);
  });

  client.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
    console.log('🔁 Reconnecting in 5 seconds...');
    setTimeout(startBot, 5000); // restart bot
  });

  client.on('error', (err) => {
    console.log('❌ Connection error:', err.message);
    console.log('🔁 Retrying in 5 seconds...');
    setTimeout(() => {
      client.close();
      startBot();
    }, 5000);
  });
}

// Start the bot for the first time
startBot();
