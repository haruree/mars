import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { z } from 'zod';
import { 
  getLastDaily,
  updateLastDaily,
  updateUserBalance,
  addItemToInventory,
  logTransaction,
  pool
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'daily',
  description: 'Claim your daily dream dust and bonus~ 📅✨',
};

export const aiConfig = {
  parameters: z.object({}),
} satisfies AiConfig;

function checkDailyCooldown(lastDaily: Date | null): { canClaim: boolean; timeLeft?: string } {
  if (!lastDaily) return { canClaim: true };
  
  const now = new Date();
  const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
  const timeSince = now.getTime() - lastDaily.getTime();
  
  if (timeSince >= cooldownMs) {
    return { canClaim: true };
  }
  
  const timeLeft = cooldownMs - timeSince;
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  return { 
    canClaim: false, 
    timeLeft: `${hours}h ${minutes}m` 
  };
}

async function getDailyStreak(userId: string, guildId: string): Promise<number> {
  const query = 'SELECT daily_streak FROM users WHERE id = $1 AND guild_id = $2';
  const result = await pool.query(query, [userId, guildId]);
  return result.rows[0]?.daily_streak || 0;
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const userId = ctx.interaction.user.id;
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }
  
  try {
    const lastDaily = await getLastDaily(userId, guildId);
    const cooldownCheck = checkDailyCooldown(lastDaily);
    
    if (!cooldownCheck.canClaim) {
      await ctx.interaction.reply(
        `📅✨ Y-you already claimed your daily bonus... please wait **${cooldownCheck.timeLeft}** before trying again! >.<`
      );
      return;
    }
    
    // Calculate rewards
    const baseReward = 100;
    const streak = await getDailyStreak(userId, guildId);
    const streakBonus = Math.min(streak * 10, 200); // Max 200 bonus
    const totalDust = baseReward + streakBonus;
    
    // Random bonus item (10% chance)
    const bonusItems = ['Dewdrop', 'Wildflower', 'Pebble'];
    let bonusItem = null;
    
    if (Math.random() < 0.1) {
      bonusItem = bonusItems[Math.floor(Math.random() * bonusItems.length)]!;
      await addItemToInventory(userId, guildId, bonusItem, 1);
      await logTransaction(userId, guildId, 'daily', undefined, bonusItem, 'Daily bonus item');
    }
    
    // Give rewards
    await updateUserBalance(userId, guildId, totalDust);
    await updateLastDaily(userId, guildId);
    await logTransaction(userId, guildId, 'daily', totalDust, undefined, 'Daily reward');
    
    const newStreak = streak + 1;
    
    let response = `📅✨ Hehe~ Here's your daily cozy bonus! Keep being lovely~ :3\n\n`;
    response += `💰 **+${totalDust.toLocaleString()} dream dust**`;
    
    if (streakBonus > 0) {
      response += ` _(+${streakBonus} streak bonus!)_`;
    }
    
    response += `\n🔥 **${newStreak} day streak!**`;
    
    if (bonusItem) {
      response += `\n🎁 **Bonus:** Found 1x ${bonusItem}!`;
    }
    
    if (newStreak % 7 === 0) {
      response += `\n\n🌟 **Weekly milestone!** You're so dedicated~ ^^`;
    }
    
    await ctx.interaction.reply(response);
    
  } catch (error) {
    console.error('Daily command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with your daily... >.<');
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
    const lastDaily = await getLastDaily(userId, guildId);
    const cooldownCheck = checkDailyCooldown(lastDaily);
    
    if (!cooldownCheck.canClaim) {
      await ctx.message.reply(
        `📅✨ Y-you already claimed your daily bonus... please wait **${cooldownCheck.timeLeft}** before trying again! >.<`
      );
      return;
    }
    
    // Calculate rewards
    const baseReward = 100;
    const streak = await getDailyStreak(userId, guildId);
    const streakBonus = Math.min(streak * 10, 200); // Max 200 bonus
    const totalDust = baseReward + streakBonus;
    
    // Random bonus item (10% chance)
    const bonusItems = ['Dewdrop', 'Wildflower', 'Pebble'];
    let bonusItem = null;
    
    if (Math.random() < 0.1) {
      bonusItem = bonusItems[Math.floor(Math.random() * bonusItems.length)]!;
      await addItemToInventory(userId, guildId, bonusItem, 1);
      await logTransaction(userId, guildId, 'daily', undefined, bonusItem, 'Daily bonus item');
    }
    
    // Give rewards
    await updateUserBalance(userId, guildId, totalDust);
    await updateLastDaily(userId, guildId);
    await logTransaction(userId, guildId, 'daily', totalDust, undefined, 'Daily reward');
    
    const newStreak = streak + 1;
    
    let response = `📅✨ Hehe~ Here's your daily cozy bonus! Keep being lovely~ :3\n\n`;
    response += `💰 **+${totalDust.toLocaleString()} dream dust**`;
    
    if (streakBonus > 0) {
      response += ` _(+${streakBonus} streak bonus!)_`;
    }
    
    response += `\n🔥 **${newStreak} day streak!**`;
    
    if (bonusItem) {
      response += `\n🎁 **Bonus:** Found 1x ${bonusItem}!`;
    }
    
    if (newStreak % 7 === 0) {
      response += `\n\n🌟 **Weekly milestone!** You're so dedicated~ ^^`;
    }
    
    await ctx.message.reply(response);
    
  } catch (error) {
    console.error('Daily command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with your daily... >.<');
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
    const lastDaily = await getLastDaily(userId, guildId);
    const cooldownCheck = checkDailyCooldown(lastDaily);
    
    if (!cooldownCheck.canClaim) {
      return {
        content: `📅✨ Y-you already claimed your daily bonus... please wait **${cooldownCheck.timeLeft}** before trying again! >.<`,
      };
    }
    
    // Calculate rewards
    const baseReward = 100;
    const streak = await getDailyStreak(userId, guildId);
    const streakBonus = Math.min(streak * 10, 200); // Max 200 bonus
    const totalDust = baseReward + streakBonus;
    
    // Random bonus item (10% chance)
    const bonusItems = ['Dewdrop', 'Wildflower', 'Pebble'];
    let bonusItem = null;
    
    if (Math.random() < 0.1) {
      bonusItem = bonusItems[Math.floor(Math.random() * bonusItems.length)]!;
      await addItemToInventory(userId, guildId, bonusItem, 1);
      await logTransaction(userId, guildId, 'daily', undefined, bonusItem, 'Daily bonus item');
    }
    
    // Give rewards
    await updateUserBalance(userId, guildId, totalDust);
    await updateLastDaily(userId, guildId);
    await logTransaction(userId, guildId, 'daily', totalDust, undefined, 'Daily reward');
    
    const newStreak = streak + 1;
    
    let response = `📅✨ Hehe~ Here's your daily cozy bonus! Keep being lovely~ :3\n\n`;
    response += `💰 **+${totalDust.toLocaleString()} dream dust**`;
    
    if (streakBonus > 0) {
      response += ` _(+${streakBonus} streak bonus!)_`;
    }
    
    response += `\n🔥 **${newStreak} day streak!**`;
    
    if (bonusItem) {
      response += `\n🎁 **Bonus:** Found 1x ${bonusItem}!`;
    }
    
    if (newStreak % 7 === 0) {
      response += `\n\n🌟 **Weekly milestone!** You're so dedicated~ ^^`;
    }
    
    return { content: response };
    
  } catch (error) {
    console.error('Daily AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with your daily... >.<',
    };
  }
};
