if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const startReminder = require('./services/reminderRunner');
const buttons = require('./interactions');
const editSession = require('./services/editSession');
const { handleSpecialMention } = require('./services/specialMention');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

    client.commands = new Map();
    const commandFiles = fs
    .readdirSync(path.join(__dirname, 'commands'))
    .filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    }

    client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
    startReminder(client);
    });

    client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const session = editSession.get(message.author.id);
    if (session?.handler) {
        try {
        await session.handler(message);
        } catch (err) {
        console.error(err);
        message.reply('Error to process edit.');
        }
        return;
    }

    try {
        await handleSpecialMention(message, client);
    } catch (err) {
        console.error('Special mention error:', err);
    }

    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('There was an error while executing this command.');
    }
    });

    client.on('interactionCreate', async (interaction) => {
    try {
        await buttons.handle(interaction);
      } catch (err) {
        console.error(err);
      
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Interaction failed.',
            ephemeral: true
          });
        }
      }
    });

    client.login(process.env.DISCORD_TOKEN);