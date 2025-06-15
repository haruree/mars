import type { CommandData, ChatInputCommand } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { z } from 'zod';

export const command: CommandData = {
  name: 'avatar',
  description: 'Show someone\'s avatar',
  options: [
    {
      name: 'user',
      description: 'The user whose avatar you want to see',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
};

export const aiConfig = {
  parameters: z
    .object({
      user: z
        .string()
        .optional()
        .describe('The user mention or ID whose avatar to show. If not provided, show the message author\'s avatar.'),
    })
    .describe('Show a user\'s avatar/profile picture'),
} satisfies AiConfig;

export const chatInput: ChatInputCommand = async (ctx) => {
  const targetUser = ctx.options.getUser('user') || ctx.interaction.user;
    const embed = new EmbedBuilder()
    .setTitle(`${targetUser.displayName}'s Avatar`)
    .setImage(targetUser.displayAvatarURL({ size: 512 }))
    .setColor(0x7289da);

  await ctx.interaction.reply({ embeds: [embed] });
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  if (!ctx.message.inGuild()) {
    return {
      error: 'Avatar command only works in servers',
    };
  }

  // Parse user from the parameters
  let targetUser = ctx.message.author;
    if (ctx.ai.params.user) {
    // Try to parse user mention or ID
    const userMatch = ctx.ai.params.user.match(/<@!?(\d+)>/) || ctx.ai.params.user.match(/(\d+)/);
    if (userMatch && userMatch[1]) {
      try {
        const fetchedUser = await ctx.message.client.users.fetch(userMatch[1]);
        targetUser = fetchedUser;
      } catch {
        return {
          error: 'Couldn\'t find that user, bestie',
        };
      }
    }
  }
  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.displayName}'s Avatar`)
    .setImage(targetUser.displayAvatarURL({ size: 512 }))
    .setColor(0x7289da);

  await ctx.message.channel.send({ embeds: [embed] });
};
