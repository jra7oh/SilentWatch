require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, PermissionsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const express = require('express');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1389383683361996800'; // your bot client ID
const GUILD_ID = '1386044830290804938';  // your server ID
const OWNER_ID = '849685727721422858';   // your Discord user ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages  // Added this intent to fix offline issue
  ]
});

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to a channel with optional file or gif')
    .addStringOption(option =>
      option.setName('content')
        .setDescription('The message you want to send')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the message to')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('A file (image/video) to attach')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('gif')
        .setDescription('Paste a direct GIF URL (e.g., from Tenor/Giphy)')
        .setRequired(false))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Register commands
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error('Command registration error:', error);
  }
})();

// On bot ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '| Stark Protocols!', type: 3 }], // shortened to fit Discord limits
    status: 'online',
  });
});

// Command handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'say') return;

  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "⛔ Only the bot owner can use this command.", ephemeral: true });
  }

  const content = interaction.options.getString('content') || '';
  const file = interaction.options.getAttachment('file');
  const gif = interaction.options.getString('gif');
  const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

  if (!targetChannel.isTextBased() || !targetChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) {
    return interaction.reply({ content: "❌ I can't send messages in that channel.", ephemeral: true });
  }

  const messageData = {};
  if (content) messageData.content = content;
  if (file) messageData.files = [file.url];
  if (gif) messageData.content = (messageData.content || '') + '\n' + gif;

  try {
    await targetChannel.send(messageData);
    await interaction.reply({ content: `✅ Message sent in ${targetChannel}`, ephemeral: true });

    const owner = await client.users.fetch(OWNER_ID);
    let log = `User ${interaction.user.tag} used /say in #${targetChannel.name}`;
    if (content) log += ` with content: "${content}"`;
    if (file) log += `\n📎 Attached file: ${file.url}`;
    if (gif) log += `\n🎞️ GIF: ${gif}`;
    await owner.send(log);

  } catch (error) {
    console.error('❌ Error sending message:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Failed to send the message.", ephemeral: true });
    }
  }
});

// === EXPRESS PING SERVER FOR RENDER/UPTIMEROBOT ===
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Web server running on port ${process.env.PORT || 3000}`);
});

client.login(TOKEN);
