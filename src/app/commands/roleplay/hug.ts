import { ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { actionEndpoints, fetchActionImage, createActionEmbed } from '../../utils/roleplay';

export const command: CommandData = {
  name: 'hug',
  description: 'Give someone a warm hug',
  options: [
    {
      name: 'target',
      description: 'The person you want to hug',
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
      const endpoint = actionEndpoints['hug'];
      if (!endpoint) {
        throw new Error('Action type not found: hug');
      }
      
      return interaction.reply({
        content: endpoint.selfMessage,
        ephemeral: true,
      });
    }
    
    // Don't allow targeting the bot
    if (target.id === interaction.client.user.id) {
      const endpoint = actionEndpoints['hug'];
      if (!endpoint) {
        throw new Error('Action type not found: hug');
      }
      
      return interaction.reply({
        content: endpoint.botMessage,
        ephemeral: true,
      });
    }

    // Fetch a random action GIF from the API
    const imageUrl = await fetchActionImage('hug');
    
    // Create the embed using our helper function
    const embed = createActionEmbed('hug', interaction.user, target)
      .setImage(imageUrl);
      
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Hug command error:', error);
    
    const endpoint = actionEndpoints['hug'];
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
