import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { z } from 'zod';
import { getUserInventory } from '../../../database/index.js';

export const command: CommandData = {
  name: 'inventory',
  description: 'View your collected items~ 🎒🧺',
  options: [
    {
      name: 'user',
      description: 'View another user\'s inventory',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    user: z.string().optional().describe('The user whose inventory to check'),
  }),
} satisfies AiConfig;

function formatInventory(items: any[], username: string, isOwnInventory: boolean) {
  // Count total items first
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
  
  if (items.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('🎒🧺 Empty Inventory')
      .setDescription(isOwnInventory 
        ? '### Y-your inventory is empty... maybe try foraging for some items? >.<\n\n💡 Use `/forage` to find items or `/daily` for rewards!'
        : `### ${username}'s inventory appears to be empty... :3\n\n*They haven't started collecting yet!*`)
      .setTimestamp()
      .setFooter({ text: isOwnInventory ? 'Start your collection today! ^^' : 'Everyone starts somewhere~ :3' });
    
    return { embeds: [embed] };
  }
  
  // Group items by rarity
  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  const groupedItems = items.reduce((groups, item) => {
    const rarity = item.rarity || 'common';
    if (!groups[rarity]) groups[rarity] = [];
    groups[rarity].push(item);
    return groups;
  }, {} as Record<string, any[]>);
  
  const embed = new EmbedBuilder()
    .setColor('#E6E6FA')
    .setTitle(isOwnInventory 
      ? '🎒🧺 Your Cozy Inventory'
      : `🎒🧺 ${username}'s Inventory`)
    .setDescription(isOwnInventory 
      ? '### Here\'s... um... everything you\'ve found so far! Hehe~ :3'
      : `### What a lovely collection ${username} has! So cozy~ ^^`)
    .setTimestamp();
  
  // Add rarity sections
  for (const rarity of rarityOrder) {
    if (groupedItems[rarity] && groupedItems[rarity].length > 0) {
      const rarityEmojis = {
        legendary: '🌟',
        epic: '💜',
        rare: '💙',
        uncommon: '💚', 
        common: '🤍'
      };
      
      const rarityEmoji = rarityEmojis[rarity as keyof typeof rarityEmojis] || '🤍';
      const capitalizedRarity = rarity.charAt(0).toUpperCase() + rarity.slice(1);      let itemsText = '';
      for (const item of groupedItems[rarity]) {
        const emoji = item.emoji || '🌸';
        itemsText += `${emoji} **${item.item_name}** \`${item.amount}\`\n`;
      }
      
      embed.addFields({
        name: `${rarityEmoji} ${capitalizedRarity} Items`,
        value: itemsText.trim() || '*No items in this rarity*',
        inline: false
      });
    }
  }
  
  // Add summary footer
  embed.addFields({
    name: '✨ Collection Summary',
    value: `📦 **Total Items:** \`${totalItems}\`\n🎒 **Unique Items:** \`${items.length}\`\n\n💡 Use \`/sell <item>\` to trade items for dream dust!`,
    inline: false
  });
  
  // Random footer messages
  const footerMessages = isOwnInventory ? [
    'Your collection sparkles! ✨',
    'Such beautiful treasures~ :3',
    'Keep collecting, you\'re doing great! ^^',
    'What a cozy collection~ >w<'
  ] : [
    'Such an amazing collection! ^^',
    'What a dedicated collector~ :3',
    'Their treasures look wonderful! >w<',
    'So inspiring! ✨'
  ];
  
  const randomFooter = footerMessages[Math.floor(Math.random() * footerMessages.length)]!;
  embed.setFooter({ text: randomFooter });
  
  return { embeds: [embed] };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  const targetUser = ctx.interaction.options.getUser('user') || ctx.interaction.user;
  
  try {
    const items = await getUserInventory(targetUser.id, guildId);
    const response = formatInventory(items, targetUser.displayName, targetUser.id === ctx.interaction.user.id);
    
    await ctx.interaction.reply(response);
    
  } catch (error) {
    console.error('Inventory command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong checking the inventory... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('❌ This command can only be used in a server!');
    return;
  }
  
  // Parse user mention or use message author
  const mentionMatch = ctx.message.content.match(/<@!?(\d+)>/);
  const targetUserId = mentionMatch ? mentionMatch[1]! : ctx.message.author.id;
  
  // Get user object for display name
  let targetUser;
  try {
    if (mentionMatch) {
      targetUser = await ctx.message.guild?.members.fetch(targetUserId).then(m => m.user);
    } else {
      targetUser = ctx.message.author;
    }
  } catch {
    targetUser = { displayName: 'Unknown User' };
  }
  
  try {
    const items = await getUserInventory(targetUserId!, guildId);
    const response = formatInventory(items, targetUser?.displayName || 'Unknown User', targetUserId === ctx.message.author.id);
    
    await ctx.message.reply(response);
    
  } catch (error) {
    console.error('Inventory command error:', error);
    await ctx.message.reply('Eep! S-something went wrong checking the inventory... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }

  // For AI commands, use the message author
  const targetUser = ctx.message.author;
  
  try {
    const items = await getUserInventory(targetUser.id, guildId);
    
    // For AI responses, we'll convert the embed to a simpler text format
    if (items.length === 0) {
      return { 
        content: '🎒🧺 Y-your inventory is empty... maybe try foraging for some items? >.<\n\n💡 Use `/forage` to find items or `/daily` for rewards!' 
      };
    }
    
    // Group items by rarity for text output
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const groupedItems = items.reduce((groups, item) => {
      const rarity = item.rarity || 'common';
      if (!groups[rarity]) groups[rarity] = [];
      groups[rarity].push(item);
      return groups;
    }, {} as Record<string, any[]>);
    
    let inventoryText = `🎒🧺 Here's... um... everything you've found so far! Hehe~ :3\n\n`;
    
    for (const rarity of rarityOrder) {
      if (groupedItems[rarity] && groupedItems[rarity].length > 0) {
        const rarityEmojis = {
          legendary: '🌟',
          epic: '💜',
          rare: '💙',
          uncommon: '💚', 
          common: '🤍'
        };
        
        const rarityEmoji = rarityEmojis[rarity as keyof typeof rarityEmojis] || '🤍';
        const capitalizedRarity = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        
        inventoryText += `${rarityEmoji} **${capitalizedRarity}**\n`;
          for (const item of groupedItems[rarity]) {
          inventoryText += `**${item.item_name}** \`${item.amount}\`\n`;
        }
        inventoryText += '\n';
      }
    }
    
    const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
    inventoryText += `✨ Total items: \`${totalItems}\``;
    
    return { content: inventoryText };
    
  } catch (error) {
    console.error('Inventory AI command error:', error);
    return {
      content: 'Eep! S-something went wrong checking the inventory... >.<',
    };
  }
};
