import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { z } from 'zod';
import { 
  getLastForage, 
  updateLastForage, 
  addItemToInventory, 
  logTransaction 
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'forage',
  description: 'Gather items from the forest~ 🍄✨🌿',
};

export const aiConfig = {
  parameters: z.object({}),
} satisfies AiConfig;

// Forageable items with their rarity weights
const forageableItems = [
  { name: 'Pebble', weight: 30, rarity: 'common' },
  { name: 'Wildflower', weight: 25, rarity: 'common' },
  { name: 'Dewdrop', weight: 20, rarity: 'common' },
  { name: 'Mushroom', weight: 15, rarity: 'common' },
  { name: 'Butterfly Wing', weight: 8, rarity: 'uncommon' },
  { name: 'Honey', weight: 7, rarity: 'uncommon' },
  { name: 'Moonstone', weight: 5, rarity: 'uncommon' },
  { name: 'Crystal Shard', weight: 3, rarity: 'rare' },
  { name: 'Fairy Wing', weight: 2, rarity: 'rare' },
  { name: 'Star Fragment', weight: 0.5, rarity: 'epic' },
];

function getRandomItem() {
  const totalWeight = forageableItems.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of forageableItems) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return forageableItems[0]!; // fallback with assertion
}

function checkCooldown(lastForage: Date | null): { canForage: boolean; timeLeft?: string } {
  if (!lastForage) return { canForage: true };
  
  const now = new Date();
  const cooldownMs = 4 * 60 * 60 * 1000; // 4 hours
  const timeSince = now.getTime() - lastForage.getTime();
  
  if (timeSince >= cooldownMs) {
    return { canForage: true };
  }
  
  const timeLeft = cooldownMs - timeSince;
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  return { 
    canForage: false, 
    timeLeft: `${hours}h ${minutes}m` 
  };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const userId = ctx.interaction.user.id;
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }
  
  try {
    const lastForage = await getLastForage(userId, guildId);
    const cooldownCheck = checkCooldown(lastForage);
    
    if (!cooldownCheck.canForage) {
      await ctx.interaction.reply(
        `🍄✨ U-um... you need to wait **${cooldownCheck.timeLeft}** before foraging again... sorry! >.<`
      );
      return;
    }
    
    // Generate 1-3 items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const foundItems: Array<{ name: string; amount: number; rarity: string }> = [];
      for (let i = 0; i < numItems; i++) {
      const item = getRandomItem();
      const amount = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
      
      // Check if we already found this item
      const existing = foundItems.find(fi => fi.name === item.name);
      if (existing) {
        existing.amount += amount;
      } else {
        foundItems.push({ name: item.name, amount, rarity: item.rarity });
      }
      
      await addItemToInventory(userId, guildId, item.name, amount);
      await logTransaction(userId, guildId, 'forage', undefined, item.name, `Found ${amount}x ${item.name}`);
    }
    
    await updateLastForage(userId, guildId);
    
    const itemsList = foundItems
      .map(item => `**${item.amount}x ${item.name}** _(${item.rarity})_`)
      .join(', ');
    
    const responses = [
      `🍄✨ U-um... I found a few shiny things in the forest... wanna see? >w<\n\nYou found: ${itemsList}`,
      `🌿✨ Eep! Look what I discovered while exploring... ^^;\n\nYou found: ${itemsList}`,
      `🍄🌸 W-wow! The forest was generous today... hehe~\n\nYou found: ${itemsList}`,
      `✨🌿 S-something caught my eye in the bushes...! >.<\n\nYou found: ${itemsList}`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.interaction.reply(randomResponse);
    
  } catch (error) {
    console.error('Forage command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong while foraging... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const userId = ctx.message.author.id;
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('❌ This command can only be used in a server!');
    return;
  }
  
  try {
    const lastForage = await getLastForage(userId, guildId);
    const cooldownCheck = checkCooldown(lastForage);
    
    if (!cooldownCheck.canForage) {
      await ctx.message.reply(
        `🍄✨ U-um... you need to wait **${cooldownCheck.timeLeft}** before foraging again... sorry! >.<`
      );
      return;
    }
    
    // Generate 1-3 items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const foundItems: Array<{ name: string; amount: number; rarity: string }> = [];
    
    for (let i = 0; i < numItems; i++) {
      const item = getRandomItem();
      const amount = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
      
      // Check if we already found this item
      const existing = foundItems.find(fi => fi.name === item.name);
      if (existing) {
        existing.amount += amount;
      } else {
        foundItems.push({ name: item.name, amount, rarity: item.rarity });
      }
      
      await addItemToInventory(userId, guildId, item.name, amount);
      await logTransaction(userId, guildId, 'forage', undefined, item.name, `Found ${amount}x ${item.name}`);
    }
    
    await updateLastForage(userId, guildId);
    
    const itemsList = foundItems
      .map(item => `**${item.amount}x ${item.name}** _(${item.rarity})_`)
      .join(', ');
    
    const responses = [
      `🍄✨ U-um... I found a few shiny things in the forest... wanna see? >w<\n\nYou found: ${itemsList}`,
      `🌿✨ Eep! Look what I discovered while exploring... ^^;\n\nYou found: ${itemsList}`,
      `🍄🌸 W-wow! The forest was generous today... hehe~\n\nYou found: ${itemsList}`,
      `✨🌿 S-something caught my eye in the bushes...! >.<\n\nYou found: ${itemsList}`
    ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.message.reply(randomResponse);
    
  } catch (error) {
    console.error('Forage command error:', error);
    await ctx.message.reply('Eep! S-something went wrong while foraging... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const userId = ctx.message.author.id;
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }
  
  try {
    const lastForage = await getLastForage(userId, guildId);
    const cooldownCheck = checkCooldown(lastForage);
    
    if (!cooldownCheck.canForage) {
      return {
        content: `🍄✨ U-um... you need to wait **${cooldownCheck.timeLeft}** before foraging again... sorry! >.<`,
      };
    }
    
    // Generate 1-3 items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const foundItems: Array<{ name: string; amount: number; rarity: string }> = [];
    
    for (let i = 0; i < numItems; i++) {
      const item = getRandomItem();
      const amount = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
      
      // Check if we already found this item
      const existing = foundItems.find(fi => fi.name === item.name);
      if (existing) {
        existing.amount += amount;
      } else {
        foundItems.push({ name: item.name, amount, rarity: item.rarity });
      }
      
      await addItemToInventory(userId, guildId, item.name, amount);
      await logTransaction(userId, guildId, 'forage', undefined, item.name, `Found ${amount}x ${item.name}`);
    }
    
    await updateLastForage(userId, guildId);
    
    const itemsList = foundItems
      .map(item => `**${item.amount}x ${item.name}** _(${item.rarity})_`)
      .join(', ');
    
    const responses = [
      `🍄✨ U-um... I found a few shiny things in the forest... wanna see? >w<\n\nYou found: ${itemsList}`,
      `🌿✨ Eep! Look what I discovered while exploring... ^^;\n\nYou found: ${itemsList}`,
      `🍄🌸 W-wow! The forest was generous today... hehe~\n\nYou found: ${itemsList}`,
      `✨🌿 S-something caught my eye in the bushes...! >.<\n\nYou found: ${itemsList}`
    ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    return { content: randomResponse };
    
  } catch (error) {
    console.error('Forage AI command error:', error);
    return {
      content: 'Eep! S-something went wrong while foraging... >.<',
    };
  }
};
