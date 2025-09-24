const bedrock = require('bedrock-protocol');

const client = bedrock.createClient({
  host: 'play.craftersmc.net',   // change this if needed
  port: 19132,                    // default Bedrock port
  username: 'OGplay4er22990',     // bot username
  offline: true,                  // set to false if using Xbox login
  version: '1.21.100'             // set to Bedrock version 1.21.100
});

client.on('join', () => {
  console.log('✅ Bot joined the server!');
  // Example: try to break a block in front of the bot
  setTimeout(() => {
    chopBlock({ x: 0, y: 0, z: 1 }); // relative coords, in front of bot
  }, 3000);
});

// Function to send "start break" and "stop break" packets
function chopBlock(position) {
  console.log('🪓 Trying to chop block at', position);

  // Start breaking
  client.queue('player_action', {
    action: 'start_break',
    position: position,
    face: 1
  });

  // Stop breaking after short delay (simulate holding tool)
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
});
