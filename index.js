require('dotenv').config();
const { Client, GatewayIntentBits, Routes, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1389383683361996800';  // Your bot's client ID
const GUILD_ID = '1386044830290804938';   // Your server's guild ID

const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to a channel with optional file')
    .addStringOption(option =>
      option.setName('content')
        .setDescription('The message content')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the message in')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('Optional file to attach')
        .setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Commands refreshed.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const content = interaction.options.getString('content') || '';
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const file = interaction.options.getAttachment('file');

    if (!channel.isTextBased() || !channel.permissionsFor(client.user).has('SendMessages')) {
      return interaction.reply({ content: 'I cannot send messages to that channel.', ephemeral: true });
    }

    const messageOptions = {};
    if (content) messageOptions.content = content;
    if (file) messageOptions.files = [file.url];

    // Optional: log who used it
    console.log(`${interaction.user.tag} used /say in ${channel.name || channel.id}`);

    try {
      await channel.send(messageOptions);
      await interaction.reply({ content: `Message sent in ${channel}`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to send the message.', ephemeral: true });
    }
  }
});

client.login(TOKEN);
