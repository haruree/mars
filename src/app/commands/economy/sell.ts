import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
import { z } from 'zod';
import { 
  getItemAmount,
  removeItemFromInventory,
  getItemInfo,
  updateUserBalance,
  logTransaction,
  getUserInventory
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'sell',
  description: 'Sell items from your inventory for dream dust~ 📦🪙',
  options: [
    {
      name: 'item',
      description: 'The name of the item to sell',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'amount',
      description: 'How many to sell (default: 1)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 1,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    item: z.string().describe('The name of the item to sell'),
    amount: z.number().int().min(1).optional().default(1).describe('How many to sell'),
  }),
} satisfies AiConfig;

async function sellItem(userId: string, guildId: string, itemName: string, amount: number) {
  // Check if user has the item
  const currentAmount = await getItemAmount(userId, guildId, itemName);
  if (currentAmount < amount) {
    return {
      success: false,
      error: `You only have **${currentAmount}x ${itemName}**... can't sell ${amount}! >.< `
    };
  }
  
  // Get item info for sell value
  const itemInfo = await getItemInfo(itemName);
  if (!itemInfo) {
    return {
      success: false,
      error: `Um... I don't know anything about "${itemName}"... s-sorry! >.<`
    };
  }
  
  if (itemInfo.sell_value <= 0) {
    return {
      success: false,
      error: `Eep! That item can't be sold... maybe it's too special? ^^;`
    };
  }
  
  // Remove items from inventory
  const removed = await removeItemFromInventory(userId, guildId, itemName, amount);
  if (!removed) {
    return {
      success: false,
      error: `S-something went wrong removing the items... >.<`
    };
  }
  
  // Add dream dust
  const totalValue = itemInfo.sell_value * amount;
  await updateUserBalance(userId, guildId, totalValue);
  await logTransaction(userId, guildId, 'sell', totalValue, itemName, `Sold ${amount}x ${itemName}`);
  
  return {
    success: true as const,
    totalValue,
    itemInfo
  };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  const itemName = ctx.interaction.options.getString('item', true);
  const amount = ctx.interaction.options.getInteger('amount') || 1;
  
  if (amount < 1 || amount > 99) {
    await ctx.interaction.reply('❌ Please specify an amount between 1 and 99!');
    return;
  }
  
  try {
    const result = await sellItem(ctx.interaction.user.id, guildId, itemName, amount);
    if (!result.success) {
      await ctx.interaction.reply(result.error!);
      return;
    }
    
    const totalValue = result.totalValue!; // We know it exists because success is true
    const responses = [
      `📦🪙 O-oh! Y-you wanna sell those...? I-I'll make sure it's counted properly! >.<\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `🪙✨ Eep! Those look valuable... here's your payment! ^^;\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `📦🌸 Thank you for the trade! I-I hope the price is fair... >w<\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.interaction.reply(randomResponse);
    
  } catch (error) {
    console.error('Sell command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with the sale... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('❌ This command can only be used in a server!');
    return;
  }

  const args = ctx.message.content.split(' ').slice(1);
  if (args.length === 0) {
    await ctx.message.reply('Please specify an item to sell! Example: `sell Pebble 5`');
    return;
  }
  
  const amount = parseInt(args[args.length - 1] || '1', 10);
  const itemName = isNaN(amount) 
    ? args.join(' ')
    : args.slice(0, -1).join(' ');
  
  const finalAmount = isNaN(amount) ? 1 : amount;
  const userId = ctx.message.author.id;
  
  if (!itemName.trim()) {
    await ctx.message.reply('Please specify an item to sell! Example: `sell Pebble 5`');
    return;
  }
    try {
    const result = await sellItem(userId, guildId, itemName, finalAmount);
    
    if (!result.success) {
      await ctx.message.reply(result.error);
      return;
    }
    
    const totalValue = result.totalValue!; // We know it exists because success is true
    const responses = [
      `📦🪙 O-oh! Y-you wanna sell those...? I-I'll make sure it's counted properly! >.<\n\nSold **${finalAmount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `🪙✨ Eep! Those look valuable... here's your payment! ^^;\n\nSold **${finalAmount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `📦🌸 Thank you for the trade! I-I hope the price is fair... >w<\n\nSold **${finalAmount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.message.reply(randomResponse);
    
  } catch (error) {
    console.error('Sell command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with the sale... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }

  const { item: itemName, amount } = ctx.ai.params;
  const userId = ctx.message.author.id;
  
  try {
    const result = await sellItem(userId, guildId, itemName, amount);
      if (!result.success) {
      return { content: result.error };
    }
    
    const totalValue = result.totalValue!; // We know it exists because success is true
    const responses = [
      `📦🪙 O-oh! Y-you wanna sell those...? I-I'll make sure it's counted properly! >.<\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `🪙✨ Eep! Those look valuable... here's your payment! ^^;\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`,
      `📦🌸 Thank you for the trade! I-I hope the price is fair... >w<\n\nSold **${amount}x ${itemName}** for **${totalValue.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    return { content: randomResponse };
    
  } catch (error) {
    console.error('Sell AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with the sale... >.<',
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
  
  if (focusedOption.name === 'item') {
    const userId = ctx.interaction.user.id;
    
    try {
      // Get user's inventory
      const inventory = await getUserInventory(userId, guildId);
      
      // Filter items based on what user is typing
      const filtered = inventory
        .filter(item => 
          item.item_name.toLowerCase().includes(focusedOption.value.toLowerCase()) &&
          item.amount > 0
        )
        .slice(0, 25) // Discord allows max 25 autocomplete options
        .map(item => ({
          name: `${item.emoji || '📦'} ${item.item_name} (${item.amount}x)`,
          value: item.item_name
        }));
      
      await ctx.interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await ctx.interaction.respond([]);
    }
  }
};
