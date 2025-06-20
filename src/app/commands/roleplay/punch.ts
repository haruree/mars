import { ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { actionEndpoints, fetchActionImage, createActionEmbed } from '../../utils/roleplay';

const ACTION_NAME = 'punch';

export const command: CommandData = {
  name: ACTION_NAME,
  description: 'Playfully punch someone',
  options: [
    {
      name: 'target',
      description: `The person you want to playfully punch`,
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const { interaction } = ctx;

  try {
    const target = interaction.options.getUser('target');
    if (!target) {
      return interaction.reply({
        content: "I couldn't find that user. Please try again with a valid user.",
        ephemeral: true,
      });
    }
    
    // Don't allow targeting yourself
    if (target.id === interaction.user.id) {
      const endpoint = actionEndpoints[ACTION_NAME];
      if (!endpoint) {
        throw new Error(`Action type not found: ${ACTION_NAME}`);
      }
      
      return interaction.reply({
        content: endpoint.selfMessage,
        ephemeral: true,
      });
    }
    
    // Don't allow targeting the bot
    if (target.id === interaction.client.user.id) {
      const endpoint = actionEndpoints[ACTION_NAME];
      if (!endpoint) {
        throw new Error(`Action type not found: ${ACTION_NAME}`);
      }
      
      return interaction.reply({
        content: endpoint.botMessage,
        ephemeral: true,
      });
    }

    // Fetch a random action GIF from the API
    const imageUrl = await fetchActionImage(ACTION_NAME);
    
    // Create the embed using our helper function
    const embed = createActionEmbed(ACTION_NAME, interaction.user, target)
      .setImage(imageUrl);
      
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error(`${ACTION_NAME} command error:`, error);
    
    const endpoint = actionEndpoints[ACTION_NAME];
    if (!endpoint) {
      return interaction.reply({
        content: "Something went wrong. Please try again later.",
        ephemeral: true,
      });
    }
    
    await interaction.reply({
      content: endpoint.errorMessage,
      ephemeral: true,
    });
  }
}; 
