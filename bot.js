
const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'EternxlsSMP.aternos.me', // Replace with your DynIP
  port: 48918,                  // Replace with your port
  username: 'notAreeb'        // Bot username
});

bot.once('spawn', () => {
  console.log('✅ Bot spawned. Staying AFK...');

  // Auto-login with password after spawn
  setTimeout(() => {
    bot.chat('/login 3043AA');
  }, 1000);

  // Jump every 40 seconds
  setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 300);
  }, 40000);

  // Send AFK chat message every 5 minutes
  setInterval(() => {
    const msg = ["Why are you so gay", "Wanna become my Gaylord?"];
    bot.chat(msg[Math.floor(Math.random() * msg.length)]);
  }, 300000);
});

bot.on('end', () => {
  console.log('❌ Disconnected. Reconnecting in 30s...');
  setTimeout(() => process.exit(1), 30000); // Auto-restart logic can be handled externally
});

bot.on('error', err => console.log('❗ Error:', err));
