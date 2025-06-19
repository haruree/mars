import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
import { z } from 'zod';
import { 
  getUserBalance,
  updateUserBalance,
  addItemToInventory,
  logTransaction,
  pool,
  getShopItems,
  getShopItem
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'buy',
  description: 'Buy items from the shop~ 🎁🌼',
  options: [
    {
      name: 'item',
      description: 'The name of the item to buy',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'amount',
      description: 'How many to buy (default: 1)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 1,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    item: z.string().describe('The name of the item to buy'),
    amount: z.number().int().min(1).optional().default(1).describe('How many to buy'),
  }),
} satisfies AiConfig;

async function buyItem(userId: string, guildId: string, itemName: string, amount: number) {
  // Check if item exists in shop
  const shopItem = await getShopItem(itemName);
  
  if (!shopItem) {
    return {
      success: false,
      error: `Eep! I don't have "${itemName}" in my shop right now... s-sorry! >.<`
    };
  }
  
  // Check stock
  if (shopItem.stock !== -1 && shopItem.stock < amount) {
    return {
      success: false,
      error: `S-sorry! I only have ${shopItem.stock} of those left... >.<`
    };
  }
  
  // Check user balance
  const userBalance = await getUserBalance(userId, guildId);
  const totalCost = shopItem.price * amount;
  
  if (userBalance < totalCost) {
    return {
      success: false,
      error: `You need **${totalCost.toLocaleString()} dream dust** but only have **${userBalance.toLocaleString()}**... m-maybe save up a bit more? ^^;`
    };
  }
  
  // Process purchase
  await updateUserBalance(userId, guildId, -totalCost);
  await addItemToInventory(userId, guildId, shopItem.name, amount);
  await logTransaction(userId, guildId, 'buy', -totalCost, shopItem.name, `Bought ${amount}x ${shopItem.name}`);
  
  // Update stock if not unlimited
  if (shopItem.stock !== -1) {
    await pool.query('UPDATE shop_items SET stock = stock - $1 WHERE id = $2', [amount, shopItem.id]);
  }
  
  return {
    success: true as const,
    totalCost,
    shopItem
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
    const result = await buyItem(ctx.interaction.user.id, guildId, itemName, amount);
    
    if (!result.success) {
      await ctx.interaction.reply(result.error!);
      return;
    }
    
    const emoji = result.shopItem.emoji || '🌸';
    const totalCost = result.totalCost!; // We know it exists because success is true
    const responses = [
      `🎁🌼 Okay! Um... I'll wrap it up nice for you~ hehe! ^-^\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🛍️✨ Eep! Thank you for shopping at my tiny store! ^^;\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🎁🌸 Y-your order is ready! I hope you like it... >w<\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.interaction.reply(randomResponse);
    
  } catch (error) {
    console.error('Buy command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with the purchase... >.<');
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
    await ctx.message.reply('Please specify an item to buy! Example: `buy Cozy Blanket 2`');
    return;
  }
  
  const amount = parseInt(args[args.length - 1] || '1', 10);
  const itemName = isNaN(amount) 
    ? args.join(' ')
    : args.slice(0, -1).join(' ');
  
  const finalAmount = isNaN(amount) ? 1 : amount;
  const userId = ctx.message.author.id;
    if (!itemName.trim()) {
    await ctx.message.reply('Please specify an item to buy! Example: `buy Cozy Blanket 2`');
    return;
  }
  
  try {
    const result = await buyItem(userId, guildId, itemName, finalAmount);
    
    if (!result.success) {
      await ctx.message.reply(result.error!);
      return;
    }
    
    const emoji = result.shopItem.emoji || '🌸';
    const totalCost = result.totalCost!; // We know it exists because success is true
    const responses = [
      `🎁🌼 Okay! Um... I'll wrap it up nice for you~ hehe! ^-^\n\n${emoji} Bought **${finalAmount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🛍️✨ Eep! Thank you for shopping at my tiny store! ^^;\n\n${emoji} Bought **${finalAmount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🎁🌸 Y-your order is ready! I hope you like it... >w<\n\n${emoji} Bought **${finalAmount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.message.reply(randomResponse);
    
  } catch (error) {
    console.error('Buy command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with the purchase... >.<');
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
    const result = await buyItem(userId, guildId, itemName, amount);
    
    if (!result.success) {
      return { content: result.error! };
    }
    
    const emoji = result.shopItem.emoji || '🌸';
    const totalCost = result.totalCost!; // We know it exists because success is true
    const responses = [
      `🎁🌼 Okay! Um... I'll wrap it up nice for you~ hehe! ^-^\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🛍️✨ Eep! Thank you for shopping at my tiny store! ^^;\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`,
      `🎁🌸 Y-your order is ready! I hope you like it... >w<\n\n${emoji} Bought **${amount}x ${result.shopItem.name}** for **${totalCost.toLocaleString()} dream dust**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    return { content: randomResponse };
    
  } catch (error) {
    console.error('Buy AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with the purchase... >.<',
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
  
  if (focusedOption.name === 'item') {    try {
      // Get shop items
      const shopItems = await getShopItems();
      
      // Define rarity emojis
      const rarityEmojis = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡'
      };
        // Filter items based on what user is typing
      const filtered = shopItems
        .filter(item => 
          item.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        )
        .slice(0, 25) // Discord allows max 25 autocomplete options
        .map(item => ({
          name: `${item.emoji || '🌸'} ${item.name} ${rarityEmojis[item.rarity as keyof typeof rarityEmojis] || '⚪'} - ${item.price.toLocaleString()} dream dust`,
          value: item.name
        }));
      
      await ctx.interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await ctx.interaction.respond([]);
    }
  }
};
