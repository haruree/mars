import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { EmbedBuilder } from 'discord.js';
import { z } from 'zod';
import { getShopItems } from '../../../database/index.js';

export const command: CommandData = {
  name: 'shop',
  description: 'Browse the cozy shop~ 🛍️🧸',
};

export const aiConfig = {
  parameters: z.object({}),
} satisfies AiConfig;

function formatShop(items: any[]) {
  if (items.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('🛍️🧸 Mars\'s Cozy Shop')
      .setDescription('### W-welcome to my tiny shop...\nBut it seems empty right now... sorry! >.<\n\n*The shop will be restocked soon~ ^^*')
      .setTimestamp()
      .setFooter({ text: 'Come back later for cozy items! :3' });
    
    return { embeds: [embed] };
  }
  
  const embed = new EmbedBuilder()
    .setColor('#E6E6FA')
    .setTitle('🛍️🧸 Mars\'s Cozy Shop')
    .setDescription('### W-welcome to my tiny shop~ Please take a look! >w<\n*Everything here is made with love and cozy vibes~ ✨*')
    .setTimestamp();
  
  // Group by category
  const categories = items.reduce((cats, item) => {
    const category = item.category || 'misc';
    if (!cats[category]) cats[category] = [];
    cats[category].push(item);
    return cats;
  }, {} as Record<string, any[]>);
  
  const categoryEmojis = {
    cozy: '🛏️💤',
    decorative: '✨🌸',
    consumable: '🧪💊',
    tools: '🔧⚒️',
    misc: '📦🎁'
  };
  
  const categoryNames = {
    cozy: 'Cozy Comfort',
    decorative: 'Decorative Delights', 
    consumable: 'Helpful Potions',
    tools: 'Useful Tools',
    misc: 'Miscellaneous Treasures'
  };
  
  // Sort categories by priority
  const categoryOrder = ['cozy', 'decorative', 'consumable', 'tools', 'misc'];
  const sortedCategories = categoryOrder.filter(cat => categories[cat]);
  
  for (const category of sortedCategories) {
    const categoryItems = categories[category];
    const emoji = categoryEmojis[category as keyof typeof categoryEmojis] || '📦🎁';
    const categoryName = categoryNames[category as keyof typeof categoryNames] || category.toUpperCase();
    
    let categoryText = '';
    
    for (const item of categoryItems as any[]) {
      const itemEmoji = item.emoji || '🌸';
      const rarityEmojis = {
        legendary: '🌟',
        epic: '�',
        rare: '�',
        uncommon: '�',
        common: '🤍'
      };
      const rarityEmoji = rarityEmojis[item.rarity as keyof typeof rarityEmojis] || '🤍';
      const capitalizedRarity = item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : 'Common';
      
      categoryText += `${itemEmoji} **${item.name}** ${rarityEmoji}\n`;
      categoryText += `💰 **${item.price.toLocaleString()}** Dream Dust ✧ *${capitalizedRarity}*\n`;
      
      if (item.description) {
        categoryText += `*${item.description}*\n`;
      }
      categoryText += '\n';
    }
    
    embed.addFields({
      name: `${emoji} ${categoryName}`,
      value: categoryText.trim() || '*No items in this category*',
      inline: false
    });
  }
  
  // Add helpful footer
  embed.addFields({
    name: '💡 ✨ How to Purchase',
    value: '```\n/buy <item name>\n```\n*Example: `/buy Cozy Blanket`*\n\n💰 Check your balance with `/balance`\n🎒 View your collection with `/inventory`',
    inline: false
  });
  
  // Random footer messages for variety
  const footerMessages = [
    'Thank you for visiting my shop~ :3',
    'All items are made with love! ^^',
    'Hope you find something cozy~ >w<',
    'Your support means everything! ✨',
    'Come back anytime for more treasures~ :3'
  ];
  
  const randomFooter = footerMessages[Math.floor(Math.random() * footerMessages.length)] || 'Thank you for visiting my shop~ :3';
  
  embed.setFooter({ text: randomFooter });
  
  return { embeds: [embed] };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  try {
    const items = await getShopItems(guildId);
    const response = formatShop(items);
    
    await ctx.interaction.reply(response);
    
  } catch (error) {
    console.error('Shop command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with the shop... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('❌ This command can only be used in a server!');
    return;
  }

  try {
    const items = await getShopItems(guildId);
    const response = formatShop(items);
    
    await ctx.message.reply(response);
    
  } catch (error) {
    console.error('Shop command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with the shop... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }

  try {
    const items = await getShopItems(guildId);
    
    // For AI commands, convert to plain text since embeds aren't supported
    if (items.length === 0) {
      return { content: '🛍️🧸 W-welcome to my tiny shop... but it seems empty right now... sorry! >.<' };
    }
    
    let shopText = `🛍️🧸 W-welcome to my tiny shop~ Please take a look! >w<\n\n`;
    
    // Group by category
    const categories = items.reduce((cats, item) => {
      const category = item.category || 'misc';
      if (!cats[category]) cats[category] = [];
      cats[category].push(item);
      return cats;
    }, {} as Record<string, any[]>);
    
    const categoryEmojis = {
      cozy: '🛏️',
      decorative: '✨',
      consumable: '🧪',
      tools: '🔧',
      misc: '📦'
    };
    
    for (const [category, categoryItems] of Object.entries(categories)) {
      const emoji = categoryEmojis[category as keyof typeof categoryEmojis] || '📦';
      shopText += `${emoji} **${category.toUpperCase()}**\n`;
      
      for (const item of categoryItems as any[]) {
        const itemEmoji = item.emoji || '🌸';
        shopText += `${itemEmoji} **${item.name}** - ${item.price.toLocaleString()} Dream Dust\n`;
        if (item.description) {
          shopText += `   ${item.description}\n`;
        }
        shopText += '\n';
      }
    }
    
    shopText += `💡 Use \`/buy <item>\` to purchase something cozy~ ^^`;
    
    return { content: shopText };
    
  } catch (error) {
    console.error('Shop AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with the shop... >.<',
    };
  }
};
