import { ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { setGuildPrefix, getGuildPrefix } from '../../../database/index.js';

export const command: CommandData = {
  name: 'setprefix',
  description: 'Change the bot\'s command prefix for text commands (default is ,)',
  options: [
    {
      name: 'prefix',
      description: 'The new prefix to use (e.g. !, ?, $, etc.)',
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 5,
    },
  ],
  // Only allow server administrators to use this command
  default_member_permissions: PermissionFlagsBits.Administrator.toString(),
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const { interaction } = ctx;
  const guildId = interaction.guildId;

  // Check if we're in a guild
  if (!guildId) {
    return interaction.reply({
      content: 'E-eep! T-this command can only be used in a server! >.<',
      ephemeral: true,
    });
  }

  // Get the new prefix from options
  const newPrefix = interaction.options.getString('prefix', true);

  // Don't allow empty prefixes or prefixes that are too long
  if (newPrefix.trim().length === 0) {
    return interaction.reply({
      content: 'U-um... the prefix can\'t be empty! >.<',
      ephemeral: true,
    });
  }

  try {
    // Get the current prefix
    const oldPrefix = await getGuildPrefix(guildId);

    // If it's the same prefix, don't update
    if (oldPrefix === newPrefix) {
      return interaction.reply({
        content: `Eep! The prefix is already set to \`${newPrefix}\`! >.<`,
        ephemeral: true,
      });
    }

    // Update the prefix in the database
    await setGuildPrefix(guildId, newPrefix);

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('✅ Prefix Updated!')
      .setDescription(`I-I've changed the prefix from \`${oldPrefix}\` to \`${newPrefix}\`! ^^`)
      .addFields([
        {
          name: 'Example Usage',
          value: `\`${newPrefix}help\` - Show help menu\n\`${newPrefix}ping\` - Check bot latency`,
        },
      ])
      .setFooter({ text: 'Slash commands like /setprefix will always work regardless of prefix! ^^' });

    // Reply with success message
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error setting prefix:', error);
    
    // Reply with error message
    await interaction.reply({
      content: 'O-oh no! Something went wrong while trying to change the prefix... >.< Please try again later!',
      ephemeral: true,
    });
  }
}; 