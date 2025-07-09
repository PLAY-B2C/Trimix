const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol'); // for ping

const config = {
  host: 'notplasmaSMP.aternos.me',
  port: 17051,
  username: 'Anouncement',
  version: '1.21.4',
  password: '/login 3043AA',
  reconnectDelay: 10000 // 10 seconds
};

let bot;
let reconnecting = false;
let intervals = [];

function createBot() {
  if (reconnecting) return; // Prevent stacked reconnects
  reconnecting = true;

  console.log(`🔁 Pinging server ${config.host}...`);

  mc.ping({ host: config.host, port: config.port }, (err, res) => {
    if (err || !res) {
      console.log('❌ Server offline. Retrying in 10s...');
      return setTimeout(() => {
        reconnecting = false;
        createBot();
      }, config.reconnectDelay);
    }

    console.log(`✅ Server is online. Version: ${res.version.name}`);
    console.log('🔌 Connecting bot...');

    bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      version: config.version
    });

    bot.once('spawn', () => {
      reconnecting = false;
      console.log('✅ Bot spawned. Staying AFK...');

      // Auto login
      setTimeout(() => {
        if (bot && bot.chat && bot._client.state === 'play') {
          bot.chat(config.password);
        }
      }, 1000);

      // 🕴️ AFK jump every 40s
      intervals.push(setInterval(() => {
        if (!bot || !bot.entity || bot._client.state !== 'play') return;
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }, 40000));

      // 💬 Random fact every 5 minutes
      const facts = [
        "Fun Fact: You can use spruce planks + shift to chop leaves faster 😎",
        "Fun Fact: Jumping while mining doubles your drop rate... probably 🪨",
        "Fun Fact: If you name a cow 'Dinnerbone' it becomes a spy 👀",
        "Fun Fact: Shift + Q throws diamonds faster. Speedrun tech 💎",
        "Fun Fact: Mining at Y=-69 gives the best enchant rates. Trust me 🤓",
        "Fun Fact: Creepers only hiss if you're being cringe 💥",
        "Fun Fact: Beds explode in the Nether because Mojang hates sleep 🛌🔥",
        "Fun Fact: Right-clicking grass with bread attracts sheep 🐑🍞",
        "Fun Fact: Mobs drop extra loot if you shout 'YEET!' IRL 🎤",
        "Fun Fact: Axolotls judge your builds silently 🥲",
        "Fun Fact: You can tame Endermen with eye contact... if you’re brave enough 😳",
        "Fun Fact: Punching wood with a stick is 17% faster (totally not made up) 🌲",
        "Fun Fact: If you throw 8 eggs at a wall, 1 becomes a chicken. Coincidence? 🐣",
        "Fun Fact: Stepping on crops resets your karma 🧘‍♀️",
        "Fun Fact: Wearing a pumpkin gives you +69 IQ 🎃"
      ];

      intervals.push(setInterval(() => {
        if (!bot || !bot.chat || bot._client.state !== 'play') return;
        try {
          const random = facts[Math.floor(Math.random() * facts.length)];
          bot.chat(random);
        } catch (e) {
          console.log("⚠️ Chat failed:", e.message);
        }
      }, 300000)); // Every 5 minutes
    });

    bot.on('end', () => {
      console.log('❌ Disconnected. Retrying in 10s...');
      cleanupAndRetry();
    });

    bot.on('error', (err) => {
      console.log('❗ Error:', err.message);
      cleanupAndRetry();
    });
  });
}

function cleanupAndRetry() {
  reconnecting = false;
  if (bot) {
    try { bot.quit(); } catch {}
    bot = null;
  }
  intervals.forEach(clearInterval);
  intervals = [];
  setTimeout(() => createBot(), config.reconnectDelay);
}

createBot();
