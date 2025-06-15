import type { CommandData, ChatInputCommand, MessageCommand } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType, PermissionsBitField } from 'discord.js';
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

  await ctx.interaction.deferReply({ ephemeral: true });  try {
    if (!ctx.interaction.channel?.isTextBased()) {
      await ctx.interaction.editReply('This command can only be used in text channels!');
      return;
    }

    let totalDeleted = 0;
    let lastMessageId = ctx.interaction.id;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    // Delete messages in batches
    while (totalDeleted < amount) {
      const batchSize = Math.min(amount - totalDeleted, 100);
      
      try {
        const messages = await ctx.interaction.channel.messages.fetch({ 
          limit: batchSize,
          before: lastMessageId
        });

        if (messages.size === 0) break;

        // Filter messages that can be deleted (not older than 14 days)
        const deletableMessages = messages.filter(msg => 
          msg.createdTimestamp > twoWeeksAgo && msg.id !== ctx.interaction.id
        );

        if (deletableMessages.size === 0) break;

        // Update lastMessageId for next iteration
        const messagesArray = Array.from(deletableMessages.values());
        if (messagesArray.length > 0) {
          lastMessageId = messagesArray[messagesArray.length - 1]!.id;
        }

        // Delete messages
        if (deletableMessages.size === 1) {
          await deletableMessages.first()?.delete();
          totalDeleted += 1;
        } else {
          const deleted = await ctx.interaction.channel.bulkDelete(deletableMessages, true);
          totalDeleted += deleted.size;
        }

        // Small delay to avoid rate limiting
        if (totalDeleted < amount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        console.error('Batch deletion error:', batchError);
        break;
      }
    }

    const response = totalDeleted > 0 
      ? `Successfully deleted ${totalDeleted} message(s)!`
      : 'No messages could be deleted (they might be too old or already deleted).';
    
    await ctx.interaction.editReply(response);
  } catch (error) {
    console.error('Purge command error:', error);
    await ctx.interaction.editReply('An error occurred while trying to delete messages.');
  }
};

export const message: MessageCommand = async (ctx) => {
  // Extract amount from message content (simple parsing)
  const args = ctx.message.content.split(' ').slice(1);
  const amount = parseInt(args[0] || '0');

  if (!amount || amount < 1 || amount > 1000) {
    await ctx.message.reply('Please provide a valid number between 1 and 1000.');
    return;
  }

  if (!ctx.message.inGuild()) {
    await ctx.message.reply('This command can only be used in a server!');
    return;
  }

  // Check if the user has permission to manage messages
  const member = ctx.message.member;
  if (!member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    await ctx.message.reply('You need the "Manage Messages" permission to use this command!');
    return;
  }

  // Check if the bot has permission to manage messages
  const botMember = await ctx.message.guild.members.fetchMe();
  if (!ctx.message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.ManageMessages)) {
    await ctx.message.reply('I need the "Manage Messages" permission to purge messages!');
    return;
  }

  try {
    if (!ctx.message.channel.isTextBased()) {
      await ctx.message.reply('This command can only be used in text channels!');
      return;
    }

    let totalDeleted = 0;
    let lastMessageId = ctx.message.id;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    // Delete messages in batches
    while (totalDeleted < amount) {
      const batchSize = Math.min(amount - totalDeleted, 100);
      
      try {
        const messages = await ctx.message.channel.messages.fetch({ 
          limit: batchSize,
          before: lastMessageId
        });

        if (messages.size === 0) break;

        // Filter messages that can be deleted (not older than 14 days)
        const deletableMessages = messages.filter(msg => 
          msg.createdTimestamp > twoWeeksAgo && msg.id !== ctx.message.id
        );

        if (deletableMessages.size === 0) break;

        // Update lastMessageId for next iteration
        const messagesArray = Array.from(deletableMessages.values());
        if (messagesArray.length > 0) {
          lastMessageId = messagesArray[messagesArray.length - 1]!.id;
        }

        // Delete messages
        if (deletableMessages.size === 1) {
          await deletableMessages.first()?.delete();
          totalDeleted += 1;
        } else {
          const deleted = await ctx.message.channel.bulkDelete(deletableMessages, true);
          totalDeleted += deleted.size;
        }

        // Small delay to avoid rate limiting
        if (totalDeleted < amount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        console.error('Message batch deletion error:', batchError);
        break;
      }
    }

    const response = totalDeleted > 0 
      ? `Successfully deleted ${totalDeleted} message(s)!`
      : 'No messages could be deleted (they might be too old or already deleted).';
    
    await ctx.message.reply(response);
  } catch (error) {
    console.error('Message purge command error:', error);
    await ctx.message.reply('An error occurred while trying to delete messages.');
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
    }    let totalDeleted = 0;
    let lastMessageId: string | undefined;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    // Delete messages in batches
    while (totalDeleted < amount) {
      const batchSize = Math.min(amount - totalDeleted, 100);
        try {        const messages = await ctx.message.channel.messages.fetch({ 
          limit: batchSize,
          before: lastMessageId
        });

        if (messages.size === 0) break;

        // Filter messages that can be deleted (not older than 14 days and not the AI trigger message)
        const deletableMessages = messages.filter(msg => 
          msg.createdTimestamp > twoWeeksAgo && msg.id !== ctx.message.id
        );

        if (deletableMessages.size === 0) break;

        // Update lastMessageId for next iteration
        const messagesArray = Array.from(deletableMessages.values());
        if (messagesArray.length > 0) {
          lastMessageId = messagesArray[messagesArray.length - 1]!.id;
        }        // Delete messages
        if (deletableMessages.size === 1) {
          await deletableMessages.first()?.delete();
          totalDeleted += 1;
        } else {
          const deleted = await ctx.message.channel.bulkDelete(deletableMessages, true);
          totalDeleted += deleted.size;
        }

        // Small delay to avoid rate limiting
        if (totalDeleted < amount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        console.error('AI batch deletion error:', batchError);
        break;      }
    }

    if (totalDeleted > 0) {
      return {
        success: true,
        message: `Successfully deleted ${totalDeleted} message(s)!`,
      };
    } else {
      return {
        error: 'No messages could be deleted (they might be too old or already deleted).',
      };
    }
  } catch (error) {
    console.error('AI purge command error:', error);
    return {
      error: 'An error occurred while trying to delete messages',
    };
  }
};
