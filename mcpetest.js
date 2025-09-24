const bedrock = require('bedrock-protocol');
const dgram = require('dgram');

const HOST = 'play.craftersmc.net';
const PORT = 19132;
const USERNAME = 'OGplay4er22990';
const VERSION = '1.21.100';
const TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

// Function to check if server responds to UDP ping
function checkServer(callback) {
  const client = dgram.createSocket('udp4');
  const message = Buffer.from(''); // empty buffer just to test
  let responded = false;

  client.send(message, PORT, HOST, (err) => {
    if (err) {
      client.close();
      return callback(false);
    }
  });

  client.on('message', () => {
    responded = true;
    client.close();
    callback(true);
  });

  // Timeout after 3 seconds
  setTimeout(() => {
    if (!responded) {
      client.close();
      callback(false);
    }
  }, 3000);
}

// Main bot function
function startBot() {
  console.log('🔍 Checking server reachability...');

  checkServer((reachable) => {
    if (!reachable) {
      console.log(`❌ Server ${HOST}:${PORT} not reachable. Retrying in 10s...`);
      return setTimeout(startBot, 10000);
    }

    console.log(`✅ Server reachable! Connecting as ${USERNAME}...`);

    const client = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      version: VERSION,
      timeout: TIMEOUT_MS
    });

    client.on('join', () => {
      console.log('✅ Bot joined the server!');
      setTimeout(() => {
        chopBlock({ x: 0, y: 0, z: 1 });
      }, 3000);
    });

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
      setTimeout(startBot, 5000);
    });

    client.on('error', (err) => {
      console.log('❌ Connection error:', err.message);
      console.log('🔁 Retrying in 5 seconds...');
      setTimeout(() => {
        client.close();
        startBot();
      }, 5000);
    });
  });
}

// Start bot for the first time
startBot();
