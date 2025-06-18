import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
import { z } from 'zod';
import { 
  getUserBalance,
  updateUserBalance,
  getItemAmount,
  removeItemFromInventory,
  addItemToInventory,
  logTransaction,
  getUserInventory
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'gift',
  description: 'Send dream dust or items to another user~ 🎀💞',
  options: [
    {
      name: 'user',
      description: 'The user to gift to',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'type',
      description: 'What to gift',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Dream Dust', value: 'dust' },
        { name: 'Item', value: 'item' },
      ],
    },    {
      name: 'amount_or_item',
      description: 'Amount of dream dust OR name of item to gift',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'item_amount',
      description: 'Amount of items to gift (if gifting an item)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 1,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    user: z.string().describe('The user to gift to (mention)'),
    type: z.enum(['dust', 'item']).describe('Whether to gift dream dust or an item'),
    amount_or_item: z.string().describe('Amount of dream dust or name of item'),
    item_amount: z.number().int().min(1).optional().default(1).describe('Amount of items if gifting an item'),
  }),
} satisfies AiConfig;

async function giftDreamDust(fromUserId: string, toUserId: string, amount: number, guildId: string) {
  const fromBalance = await getUserBalance(fromUserId, guildId);
  
  if (fromBalance < amount) {
    return {
      success: false,
      error: `You only have **${fromBalance.toLocaleString()} dream dust** but tried to gift **${amount.toLocaleString()}**... s-sorry! >.<`
    };
  }
  
  await updateUserBalance(fromUserId, guildId, -amount);
  await updateUserBalance(toUserId, guildId, amount);
  
  await logTransaction(fromUserId, guildId, 'gift_sent', -amount, undefined, `Gifted ${amount} dream dust`);
  await logTransaction(toUserId, guildId, 'gift_received', amount, undefined, `Received ${amount} dream dust`);
  
  return { success: true as const, amount };
}

async function giftItem(fromUserId: string, toUserId: string, itemName: string, amount: number, guildId: string) {
  const fromAmount = await getItemAmount(fromUserId, itemName, guildId);
  
  if (fromAmount < amount) {
    return {
      success: false,
      error: `You only have **${fromAmount}x ${itemName}** but tried to gift **${amount}x**... >.<`
    };
  }
  
  const removed = await removeItemFromInventory(fromUserId, guildId, itemName, amount);
  if (!removed) {
    return {
      success: false,
      error: `S-something went wrong removing the items... >.<`
    };
  }
  
  await addItemToInventory(toUserId, guildId, itemName, amount);
  
  await logTransaction(fromUserId, guildId, 'gift_sent', undefined, itemName, `Gifted ${amount}x ${itemName}`);
  await logTransaction(toUserId, guildId, 'gift_received', undefined, itemName, `Received ${amount}x ${itemName}`);
  
  return { success: true as const, itemName, amount };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  const targetUser = ctx.interaction.options.getUser('user', true);
  const giftType = ctx.interaction.options.getString('type', true);
  const amountOrItem = ctx.interaction.options.getString('amount_or_item', true);
  const itemAmount = ctx.interaction.options.getInteger('item_amount') || 1;
  const fromUserId = ctx.interaction.user.id;
  
  if (targetUser.id === fromUserId) {
    await ctx.interaction.reply('Eep! You can\'t gift things to yourself... that would be silly! ^^;');
    return;
  }
  
  if (targetUser.bot) {
    await ctx.interaction.reply('Um... bots don\'t really need gifts... but that\'s sweet of you! >.<');
    return;
  }
  
  try {
    if (giftType === 'dust') {
      const amount = parseInt(amountOrItem, 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.interaction.reply('Please enter a valid amount of dream dust to gift!');
        return;
      }
      
      const result = await giftDreamDust(fromUserId, targetUser.id, amount, guildId);
      
      if (!result.success) {
        await ctx.interaction.reply(result.error!);
        return;
      }
      
      await ctx.interaction.reply(
        `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${amount.toLocaleString()} dream dust** to ${targetUser.displayName}!`
      );
      
    } else if (giftType === 'item') {
      const itemName = amountOrItem;
      
      const result = await giftItem(fromUserId, targetUser.id, itemName, itemAmount, guildId);
      
      if (!result.success) {
        await ctx.interaction.reply(result.error!);
        return;
      }
      
      await ctx.interaction.reply(
        `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${itemAmount}x ${itemName}** to ${targetUser.displayName}!`
      );
    }
    
  } catch (error) {
    console.error('Gift command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with the gift... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const mentionedUser = ctx.message.mentions.users.first();
  if (!mentionedUser) {
    await ctx.message.reply('Please mention someone to gift to! Example: `gift @user dust 100` or `gift @user item Pebble 5`');
    return;
  }
  
  const args = ctx.message.content.split(' ').slice(1);
  const userMentionIndex = args.findIndex(arg => arg.includes(mentionedUser.id));
  const afterUser = args.slice(userMentionIndex + 1);
  
  if (afterUser.length < 2) {
    await ctx.message.reply('Please specify what to gift! Example: `gift @user dust 100` or `gift @user item Pebble 5`');
    return;
  }
  
  const giftType = afterUser[0]!.toLowerCase();
  const fromUserId = ctx.message.author.id;
  
  if (mentionedUser.id === fromUserId) {
    await ctx.message.reply('Eep! You can\'t gift things to yourself... that would be silly! ^^;');
    return;
  }
  
  if (mentionedUser.bot) {
    await ctx.message.reply('Um... bots don\'t really need gifts... but that\'s sweet of you! >.<');
    return;
  }
  
  try {
    if (giftType === 'dust' || giftType === 'dreamdust') {
      const amount = parseInt(afterUser[1] || '0', 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.message.reply('Please enter a valid amount of dream dust to gift!');
        return;
      }
      
      const result = await giftDreamDust(fromUserId, mentionedUser.id, amount, ctx.message.guildId!);
      
      if (!result.success) {
        await ctx.message.reply(result.error!);
        return;
      }
      
      await ctx.message.reply(
        `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${amount.toLocaleString()} dream dust** to ${mentionedUser.displayName}!`
      );
      
    } else if (giftType === 'item') {
      const itemAmount = parseInt(afterUser[afterUser.length - 1] || '1', 10);
      const itemName = isNaN(itemAmount) 
        ? afterUser.slice(1).join(' ')
        : afterUser.slice(1, -1).join(' ');
      
      const finalAmount = isNaN(itemAmount) ? 1 : itemAmount;
      
      if (!itemName.trim()) {
        await ctx.message.reply('Please specify an item to gift!');
        return;
      }
      
      const result = await giftItem(fromUserId, mentionedUser.id, itemName, finalAmount, ctx.message.guildId!);
      
      if (!result.success) {
        await ctx.message.reply(result.error!);
        return;
      }
      
      await ctx.message.reply(
        `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${finalAmount}x ${itemName}** to ${mentionedUser.displayName}!`
      );
    } else {
      await ctx.message.reply('Please specify "dust" or "item"! Example: `gift @user dust 100` or `gift @user item Pebble 5`');
    }
    
  } catch (error) {
    console.error('Gift command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with the gift... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const { user, type, amount_or_item, item_amount } = ctx.ai.params;
  const mentionedUser = ctx.message.mentions.users.first();
  const fromUserId = ctx.message.author.id;
  
  if (!mentionedUser) {
    return {
      content: 'Please mention someone to gift to! ^^;',
    };
  }
  
  if (mentionedUser.id === fromUserId) {
    return {
      content: 'Eep! You can\'t gift things to yourself... that would be silly! ^^;',
    };
  }
  
  if (mentionedUser.bot) {
    return {
      content: 'Um... bots don\'t really need gifts... but that\'s sweet of you! >.<',
    };
  }
  
  try {
    if (type === 'dust') {
      const amount = parseInt(amount_or_item, 10);
      if (isNaN(amount) || amount <= 0) {
        return {
          content: 'Please specify a valid amount of dream dust to gift! ^^;',
        };
      }
      
      const result = await giftDreamDust(fromUserId, mentionedUser.id, amount, ctx.message.guildId!);
      
      if (!result.success) {
        return { content: result.error! };
      }
      
      return {
        content: `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${amount.toLocaleString()} dream dust** to ${mentionedUser.displayName}!`,
      };
      
    } else if (type === 'item') {
      const itemName = amount_or_item;
      
      const result = await giftItem(fromUserId, mentionedUser.id, itemName, item_amount, ctx.message.guildId!);
      
      if (!result.success) {
        return { content: result.error! };
      }
      
      return {
        content: `🎀💞 Wah~ That's so sweet of you to give someone a gift! (≧◡≦)\n\nYou gifted **${item_amount}x ${itemName}** to ${mentionedUser.displayName}!`,
      };
    }
    
    return {
      content: 'Please specify whether to gift "dust" or "item"! ^^;',
    };
    
  } catch (error) {
    console.error('Gift AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with the gift... >.<',
    };
  }
};

export const autocomplete = async (ctx: any) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.respond([]);
    return;
  }

  const focusedOption = ctx.interaction.options.getFocused(true);
  
  if (focusedOption.name === 'amount_or_item') {
    const userId = ctx.interaction.user.id;
    const giftType = ctx.interaction.options.getString('type');
    
    try {
      if (giftType === 'item') {
        // Show user's inventory for item gifts
        const inventory = await getUserInventory(userId, guildId);
        
        const filtered = inventory
          .filter(item => 
            item.item_name.toLowerCase().includes(focusedOption.value.toLowerCase()) &&
            item.amount > 0
          )
          .slice(0, 25)
          .map(item => ({
            name: `${item.emoji || '📦'} ${item.item_name} (${item.amount}x available)`,
            value: item.item_name
          }));
        
        await ctx.interaction.respond(filtered);
      } else if (giftType === 'dust') {
        // Show common dream dust amounts
        const suggestions = ['100', '500', '1000', '2500', '5000'];
        const filtered = suggestions
          .filter(amount => amount.includes(focusedOption.value))
          .map(amount => ({
            name: `${amount} dream dust`,
            value: amount
          }));
        
        await ctx.interaction.respond(filtered);
      } else {
        await ctx.interaction.respond([]);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      await ctx.interaction.respond([]);
    }
  }
};
