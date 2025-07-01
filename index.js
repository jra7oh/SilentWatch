require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');

const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1389383683361996800';
const GUILD_ID = '1386044830290804938';
const OWNER_ID = '849685727721422858';

const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to a channel with optional file, image, and video URLs')
    .addStringOption(option =>
      option.setName('content')
        .setDescription('The content of the message you want to send.')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where you want to send the message.')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('A file you want to attach to the message.')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('A GIF or photo URL to embed beside the message.')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('video')
        .setDescription('A video URL to send (auto-embedded by Discord).')
        .setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔁 Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const content = interaction.options.getString('content') || '';
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const file = interaction.options.getAttachment('file');
    const imageUrl = interaction.options.getString('image');
    const videoUrl = interaction.options.getString('video');

    if (!channel.isTextBased() || !channel.permissionsFor(client.user).has('SendMessages')) {
      return interaction.reply({ content: '❌ I cannot send messages to that channel.', ephemeral: true });
    }

    const messageOptions = {};
    if (content) messageOptions.content = content;
    if (file) messageOptions.files = [file.url];

    if (imageUrl) {
      try {
        new URL(imageUrl);
        const embed = new EmbedBuilder().setImage(imageUrl);
        messageOptions.embeds = [embed];
      } catch {
        // ignore invalid URLs
      }
    }

    if (videoUrl) {
      try {
        new URL(videoUrl);
        messageOptions.content = (messageOptions.content || '') + `\n${videoUrl}`;
      } catch {
        // ignore invalid URLs
      }
    }

    console.log(`${interaction.user.tag} used /say in ${channel.name || channel.id}`);

    try {
      await channel.send(messageOptions);
      await interaction.reply({ content: `✅ Message sent in ${channel}`, ephemeral: true });

      try {
        const ownerUser = await client.users.fetch(OWNER_ID);
        await ownerUser.send(`User ${interaction.user.tag} used /say in #${channel.name || channel.id} with content: "${content}"${imageUrl ? `, image: ${imageUrl}` : ''}${videoUrl ? `, video: ${videoUrl}` : ''}`);
        console.log('DM sent to owner.');
      } catch (dmError) {
        console.error(`Failed to send DM to owner: ${dmError}`);
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to send the message.', ephemeral: true });
    }
  }
});

client.login(TOKEN);
