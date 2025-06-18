import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
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
  if (items.length === 0) {
    if (isOwnInventory) {
      return `🎒🧺 Y-your inventory is empty... maybe try foraging for some items? >.<`;
    } else {
      return `🎒🧺 ${username}'s inventory appears to be empty... :3`;
    }
  }
  
  // Group items by rarity
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const groupedItems = items.reduce((groups, item) => {
    const rarity = item.rarity || 'common';
    if (!groups[rarity]) groups[rarity] = [];
    groups[rarity].push(item);
    return groups;
  }, {} as Record<string, any[]>);
  
  let inventoryText = isOwnInventory 
    ? `🎒🧺 Here's... um... everything you've found so far! Hehe~ :3\n\n`
    : `🎒🧺 ${username}'s inventory~ ^^;\n\n`;
  
  for (const rarity of rarityOrder) {
    if (groupedItems[rarity] && groupedItems[rarity].length > 0) {
      const rarityEmoji = {
        common: '⚪',
        uncommon: '🟢', 
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡'
      }[rarity] || '⚪';
      
      inventoryText += `${rarityEmoji} **${rarity.toUpperCase()}**\n`;
      
      for (const item of groupedItems[rarity]) {
        const emoji = item.emoji || '🌸';
        inventoryText += `${emoji} **${item.amount}x ${item.item_name}**`;
        if (item.description) {
          inventoryText += ` - _${item.description}_`;
        }
        inventoryText += '\n';
      }
      inventoryText += '\n';
    }
  }
  
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
  inventoryText += `✨ Total items: **${totalItems}**`;
  
  return inventoryText.trim();
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
  
  try {
    const items = await getUserInventory(targetUserId!, guildId);
    const response = formatInventory(items, targetUserId, targetUserId === ctx.message.author.id);
    
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
    };  }

  // For AI commands, the user parameter comes from natural language processing
  // We'll default to the message author for now
  const targetUserId = ctx.message.author.id;
  
  try {
    const items = await getUserInventory(targetUserId, guildId);
    const response = formatInventory(items, targetUserId, true);
    
    return { content: response };
    
  } catch (error) {
    console.error('Inventory AI command error:', error);
    return {
      content: 'Eep! S-something went wrong checking the inventory... >.<',
    };
  }
};
