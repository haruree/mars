import type { CommandData, ChatInputCommand } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType, PermissionsBitField, Collection, Message } from 'discord.js';
import { z } from 'zod';

export const command: CommandData = {
  name: 'purge',
  description: 'Delete a specified number of messages from the channel',
  default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString(),
  options: [
    {
      name: 'amount',
      description: 'Number of messages to delete (1-1000)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1,
      max_value: 1000,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    amount: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .describe('The number of messages to delete (1-1000)'),
  }),
} satisfies AiConfig;

export const chatInput: ChatInputCommand = async (ctx) => {
  const amount = ctx.options.getInteger('amount', true);

  if (!ctx.interaction.inGuild()) {
    await ctx.interaction.reply({
      content: 'This command can only be used in a server!',
      ephemeral: true,
    });
    return;
  }
  // Check if the bot has permission to manage messages
  const botMember = await ctx.interaction.guild!.members.fetchMe();
  if (!ctx.interaction.channel?.permissionsFor(botMember)?.has(PermissionsBitField.Flags.ManageMessages)) {
    await ctx.interaction.reply({
      content: 'I need the "Manage Messages" permission to purge messages!',
      ephemeral: true,
    });
    return;
  }

  await ctx.interaction.deferReply({ ephemeral: true });

  try {
    if (!ctx.interaction.channel?.isTextBased()) {
      await ctx.interaction.editReply('This command can only be used in text channels!');
      return;
    }

    // Delete messages in batches (Discord API limit is 100 per request)
    let totalDeleted = 0;
    let remainingToDelete = amount;

    while (remainingToDelete > 0 && totalDeleted < amount) {
      const batchSize = Math.min(remainingToDelete, 100);
      
      const messages = await ctx.interaction.channel.messages.fetch({ 
        limit: batchSize,
        before: ctx.interaction.id // Don't delete the command interaction
      });

      if (messages.size === 0) break;

      // Filter out messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletableMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

      if (deletableMessages.size === 0) {
        await ctx.interaction.editReply(
          `Could only delete ${totalDeleted} messages. Remaining messages are older than 14 days and cannot be bulk deleted.`
        );
        return;
      }

      if (deletableMessages.size === 1) {
        await deletableMessages.first()?.delete();
        totalDeleted += 1;
      } else {
        await ctx.interaction.channel.bulkDelete(deletableMessages);
        totalDeleted += deletableMessages.size;
      }

      remainingToDelete -= deletableMessages.size;
    }

    await ctx.interaction.editReply(`Successfully deleted ${totalDeleted} message(s)!`);
  } catch (error) {
    console.error('Purge command error:', error);
    await ctx.interaction.editReply('An error occurred while trying to delete messages.');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  if (!ctx.message.inGuild()) {
    return {
      error: 'Purge command can only be used in a server',
    };
  }

  // Check if the user has permission to manage messages
  const member = ctx.message.member;
  if (!member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return {
      error: 'You need the "Manage Messages" permission to use the purge command',
    };
  }

  // Check if the bot has permission to manage messages
  const botMember = await ctx.message.guild.members.fetchMe();
  if (!ctx.message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.ManageMessages)) {
    return {
      error: 'I need the "Manage Messages" permission to purge messages',
    };
  }

  const { amount } = ctx.ai.params;

  try {
    if (!ctx.message.channel.isTextBased()) {
      return {
        error: 'Purge command can only be used in text channels',
      };
    }

    // Delete messages in batches
    let totalDeleted = 0;
    let remainingToDelete = amount;

    while (remainingToDelete > 0 && totalDeleted < amount) {
      const batchSize = Math.min(remainingToDelete, 100);
      
      const messages = await ctx.message.channel.messages.fetch({ 
        limit: batchSize,
        before: ctx.message.id // Don't delete the AI trigger message
      });

      if (messages.size === 0) break;

      // Filter out messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletableMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

      if (deletableMessages.size === 0) {
        return {
          content: `Could only delete ${totalDeleted} messages. Remaining messages are older than 14 days and cannot be bulk deleted.`,
        };
      }

      if (deletableMessages.size === 1) {
        await deletableMessages.first()?.delete();
        totalDeleted += 1;
      } else {
        await ctx.message.channel.bulkDelete(deletableMessages);
        totalDeleted += deletableMessages.size;
      }

      remainingToDelete -= deletableMessages.size;
    }

    return {
      content: `Successfully deleted ${totalDeleted} message(s)!`,
    };
  } catch (error) {
    console.error('AI Purge command error:', error);
    return {
      error: 'An error occurred while trying to delete messages',
    };
  }
};
