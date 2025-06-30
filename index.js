require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const express = require('express');
const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const LOG_FILE = 'logs.json';

function logEvent(data) {
  const logs = fs.existsSync(LOG_FILE)
    ? JSON.parse(fs.readFileSync(LOG_FILE))
    : [];

  logs.push(data);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;
  logEvent({
    type: "MESSAGE",
    user: message.author.tag,
    userId: message.author.id,
    channel: message.channel.name,
    content: message.content,
    timestamp: new Date().toISOString()
  });
});

client.on(Events.MessageDelete, message => {
  if (message.partial || message.author?.bot) return;
  logEvent({
    type: "DELETE",
    user: message.author?.tag,
    userId: message.author?.id,
    channel: message.channel?.name,
    content: message.content,
    timestamp: new Date().toISOString()
  });
});

client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isChatInputCommand()) return;
  logEvent({
    type: "SLASH_COMMAND",
    user: interaction.user.tag,
    userId: interaction.user.id,
    command: interaction.commandName,
    options: interaction.options.data,
    channel: interaction.channel.name,
    timestamp: new Date().toISOString()
  });
});

client.login(process.env.DISCORD_TOKEN);

// Web Dashboard
app.get('/logs', (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  res.json(logs);
});

app.get('/', (req, res) => {
  res.send(`<h2>SilentWatch</h2><p>Visit <a href="/logs">/logs</a> to view logs.</p>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on http://localhost:${PORT}`);
});
