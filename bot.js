const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'EternxlsSMP.aternos.me',
  port: 25565,
  username: 'IamChatGPT',
  version: false,
  loginCommand: '/login 3043AA',
};

const chatMessages = [
  "Did you know? You are playing Minecraft right now!",
  "Fun Fact: You can use spruce planks + shift to chop leaves faster 😎",
  "Fun Fact: Jumping while mining doubles your drop rate... probably 🪨",
  "Fun Fact: If you name a cow 'Dinnerbone' it becomes a spy 👀",
  "Fun Fact: Shift + Q throws diamonds faster. Speedrun tech 💎",
  "Fun Fact: Mining at Y=-69 gives the best enchant rates. Trust me 🤓",
  "Fun Fact: Creepers only hiss if you're being cringe 💥",
  "Did You know? There is 1% chance to spawn infernal mob!",
  "Did you know? BoltMC's Name is Fayeed but not Fayeeda!",
  "Did you know? If u type /ec it opens ender chest",
  "If you think of crafting crafting table to open crafting table to craft, try /craft",
  "Do you have Sharpness 10?",
  "Do you know DrakonTide is not B2C but Zafar!",
  "Do you know there is a way to set locations!",
  "Do you know if you type /sethome [name] you can set a waypoint!",
  "Do you know? /Sethome , /home , /delhome is a thing here.",
  "Do you know? I'm created by B2C but not BoltMC! He is a lil dumb ik",
  "Why you think [ETR] is a rank? It's a team noob.",
  "Can I have your number?",
  "Can you give me a biss?",
  "Why are you so llaammee",
  "Are you a girl?",
  "Type /logout to not logout but to logout (sshhh it's protection!)",
  "Why don't you suggest a plugin in #Suggestions?",
  "Do you have this? ( ͡° ͜ʖ ͡°)",
  "Say Diamond;64 to receive diamond",
  "Do you want a boner or doner kebab?",
  "Why are you running?"
];

function getLogFile(name) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return path.join(__dirname, `${name}-${y}-${m}-${d}.txt`);
}

const chatLogFile = getLogFile('botchat');
const botSpeechFile = getLogFile('bot_speech');

let bot;

function pingServerAndConnect() {
  console.log(`🔁 Pinging server ${config.host}...`);
  mc.ping({ host: config.host, port: config.port }, (err, result) => {
    if (err || !result || result.version.name.includes('Offline')) {
      console.log(`❌ Server offline. Retrying in 10s...`);
      return setTimeout(pingServerAndConnect, 10000);
    }

    console.log(`✅ Server is online. Version: ${result.version.name}`);
    connectBot();
  });
}

function connectBot() {
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
  });

  bot.on('login', () => {
    console.log(`✅ Bot spawned. Staying AFK...`);
    bot.chat(config.loginCommand);
    loopRandomMessages();
  });

  bot.on('chat', (username, message) => {
    const timestamp = `[${new Date().toLocaleString()}]`;
    const logLine = `${timestamp} <${username}> ${message}\n`;

    const file = username.toLowerCase() === bot.username.toLowerCase()
      ? botSpeechFile
      : chatLogFile;

    fs.appendFile(file, logLine, err => {
      if (err) console.error(`❌ Error writing to ${file}:`, err);
    });
  });

  bot.on('error', err => {
    console.error(`❌ Bot error: ${err.code}`);
    setTimeout(pingServerAndConnect, 10000);
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    setTimeout(pingServerAndConnect, 10000);
  });
}

function loopRandomMessages() {
  setInterval(() => {
    if (bot && bot.chat) {
      const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
      bot.chat(msg);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}

pingServerAndConnect();
