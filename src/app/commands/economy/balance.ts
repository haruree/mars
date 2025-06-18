import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
import { z } from 'zod';
import { getUserBalance } from '../../../database/index.js';

export const command: CommandData = {
  name: 'balance',
  description: 'Check your dream dust balance or someone else\'s~ 💰🌸',
  options: [
    {
      name: 'user',
      description: 'The user whose balance you want to check',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    user: z.string().optional().describe('The user to check balance for (mention or username)'),
  }),
} satisfies AiConfig;

export const chatInput: ChatInputCommand = async (ctx) => {  const targetUser = ctx.options.getUser('user') || ctx.interaction.user;
  const isOwnBalance = targetUser.id === ctx.interaction.user.id;
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('This command can only be used in a server! ^^;');
    return;
  }
  
  try {
    const balance = await getUserBalance(targetUser.id, guildId);
    
    if (isOwnBalance) {
      await ctx.interaction.reply(
        `💰🌸 Y-you have... um... **${balance.toLocaleString()} dream dust** saved up... I-I think... hehe~ >///<`
      );
    } else {
      await ctx.interaction.reply(
        `💰🌸 ${targetUser.displayName} has **${balance.toLocaleString()} dream dust**... that's what I found in my records! >w<`
      );
    }
  } catch (error) {
    console.error('Balance command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong checking the balance... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const mentionedUser = ctx.message.mentions.users.first();
  const targetUser = mentionedUser || ctx.message.author;
  const isOwnBalance = targetUser.id === ctx.message.author.id;
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('This command can only be used in a server! ^^;');
    return;
  }
  
  try {
    const balance = await getUserBalance(targetUser.id, guildId);
    
    if (isOwnBalance) {
      await ctx.message.reply(
        `💰🌸 Y-you have... um... **${balance.toLocaleString()} dream dust** saved up... I-I think... hehe~ >///<`
      );
    } else {
      await ctx.message.reply(
        `💰🌸 ${targetUser.displayName} has **${balance.toLocaleString()} dream dust**... that's what I found in my records! >w<`
      );
    }
  } catch (error) {
    console.error('Balance command error:', error);
    await ctx.message.reply('Eep! S-something went wrong checking the balance... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const { user } = ctx.ai.params;
  let targetUser = ctx.message.author;
  
  if (user) {
    // Try to find mentioned user
    const mentionedUser = ctx.message.mentions.users.first();
    if (mentionedUser) {
      targetUser = mentionedUser;
    }
  }
    const isOwnBalance = targetUser.id === ctx.message.author.id;
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return { content: 'This command can only be used in a server! ^^;' };
  }
  
  try {
    const balance = await getUserBalance(targetUser.id, guildId);
    
    if (isOwnBalance) {
      return {
        content: `💰🌸 Y-you have... um... **${balance.toLocaleString()} dream dust** saved up... I-I think... hehe~ >///<`,
      };
    } else {
      return {
        content: `💰🌸 ${targetUser.displayName} has **${balance.toLocaleString()} dream dust**... that's what I found in my records! >w<`,
      };
    }
  } catch (error) {
    console.error('Balance AI command error:', error);
    return {
      content: 'Eep! S-something went wrong checking the balance... >.<',
    };
  }
};
