import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { z } from 'zod';
import { 
  getUserBalance,
  getUserInventory,
  pool
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'profile',
  description: 'View your cozy profile~ 🧸📖',
  options: [
    {
      name: 'user',
      description: 'View another user\'s profile',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    user: z.string().optional().describe('The user whose profile to check'),
  }),
} satisfies AiConfig;

async function getUserStats(userId: string, guildId: string) {
  // Get user data
  const userQuery = `
    SELECT dream_dust, daily_streak, last_daily, created_at 
    FROM users 
    WHERE id = $1 AND guild_id = $2
  `;
  const userResult = await pool.query(userQuery, [userId, guildId]);
  const userData = userResult.rows[0];
  
  if (!userData) {
    return null;
  }
  
  // Get inventory stats
  const inventory = await getUserInventory(userId, guildId);
  const totalItems = inventory.reduce((sum: number, item: any) => sum + item.amount, 0);
  
  // Count items by rarity
  const rarityCount = inventory.reduce((counts: any, item: any) => {
    const rarity = item.rarity || 'common';
    counts[rarity] = (counts[rarity] || 0) + item.amount;
    return counts;
  }, {});
    // Get transaction stats
  const transactionQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE type = 'forage') as forages,
      COUNT(*) FILTER (WHERE type = 'daily') as daily_claims,
      COUNT(*) FILTER (WHERE type = 'buy') as purchases,
      COUNT(*) FILTER (WHERE type = 'sell') as sales,
      COUNT(*) FILTER (WHERE type = 'gift_sent') as gifts_sent,
      COUNT(*) FILTER (WHERE type = 'gift_received') as gifts_received
    FROM transactions 
    WHERE user_id = $1 AND guild_id = $2
  `;
  const transactionResult = await pool.query(transactionQuery, [userId, guildId]);
  const stats = transactionResult.rows[0];
  
  return {
    ...userData,
    totalItems,
    rarityCount,
    stats
  };
}

function formatProfile(user: any, userStats: any, isOwnProfile: boolean) {
  if (!userStats) {
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('🧸📖 Cozy Profile')
      .setDescription(isOwnProfile 
        ? '### Y-your profile is... um... empty!\nMaybe try using `/forage` or `/daily` first? >.<'
        : `### ${user.displayName} hasn't started their cozy journey yet...\nThey need to try some commands first! ^^;`)
      .setTimestamp();
    
    if (!isOwnProfile && user.displayAvatarURL) {
      embed.setThumbnail(user.displayAvatarURL());
    }
    
    return { embeds: [embed] };
  }
  
  const joinDate = new Date(userStats.created_at).toLocaleDateString();
  const daysSinceJoin = Math.floor((Date.now() - new Date(userStats.created_at).getTime()) / (1000 * 60 * 60 * 24));
  
  const embed = new EmbedBuilder()
    .setColor('#E6E6FA')
    .setTitle(isOwnProfile 
      ? '🧸📖 Your Cozy Profile'
      : `🧸📖 ${user.displayName}'s Cozy Profile`)
    .setDescription(isOwnProfile 
      ? '### Y-you look so nice! Here\'s your cozy profile~ >w<'
      : '### What a lovely collection! So cozy~ ^^')
    .setTimestamp();
  
  if (!isOwnProfile && user.displayAvatarURL) {
    embed.setThumbnail(user.displayAvatarURL());
  }
    // Currency & Daily Stats
  embed.addFields({
    name: '💰 💎 Wealth & Dedication',
    value: [
      `💰 **Dream Dust** ✧ \`${userStats.dream_dust.toLocaleString()}\``,
      `🔥 **Daily Streak** ✧ \`${userStats.daily_streak}\` days`,
      ''
    ].join('\n'),
    inline: true
  });
  
  // Collection Overview
  embed.addFields({
    name: '📦 ✨ Collection Overview',
    value: [
      `📦 **Total Items** ✧ \`${userStats.totalItems}\``,
      `📅 **Journey Started** ✧ ${joinDate}`,
      `⏰ **Days Active** ✧ \`${daysSinceJoin}\` days`,
      ''
    ].join('\n'),
    inline: true
  });
  
  // Spacer field for better layout
  embed.addFields({
    name: '\u200B',
    value: '\u200B',
    inline: true
  });
  
  // Rarity breakdown with better formatting
  if (Object.keys(userStats.rarityCount).length > 0) {
    const rarityEmojis = {
      legendary: '🌟',
      epic: '�',
      rare: '�',
      uncommon: '�',
      common: '🤍'
    };
    
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];    const rarityText = rarityOrder
      .filter(rarity => userStats.rarityCount[rarity] > 0)
      .map(rarity => {
        const count = userStats.rarityCount[rarity];
        const emoji = rarityEmojis[rarity as keyof typeof rarityEmojis];
        const capitalizedRarity = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        return `${emoji} **${capitalizedRarity}** ✧ \`${count}\``;
      })
      .join('\n');
    
    embed.addFields({
      name: '🌈 ✨ Collection by Rarity',
      value: rarityText || '🤍 No items yet... time to forage! >.<',
      inline: true
    });
  } else {
    embed.addFields({
      name: '🌈 ✨ Collection by Rarity',
      value: '🤍 No items yet... time to forage! >.<',
      inline: true
    });
  }
    // Trading & Shopping Activity
  const tradingText = [
    `🛍️ **Purchases** ✧ \`${userStats.stats.purchases || 0}\``,
    `💰 **Sales** ✧ \`${userStats.stats.sales || 0}\``,
    `🎁 **Gifts Sent** ✧ \`${userStats.stats.gifts_sent || 0}\``,
    `💝 **Gifts Received** ✧ \`${userStats.stats.gifts_received || 0}\``
  ].join('\n');
  
  embed.addFields({
    name: '🤝 � Trading & Gifting',
    value: tradingText,
    inline: true
  });
    // Adventure Activity
  const adventureText = [
    `🍄 **Foraging Trips** ✧ \`${userStats.stats.forages || 0}\``,
    `📅 **Daily Rewards** ✧ \`${userStats.stats.daily_claims || 0}\``,
    '',
    `*${isOwnProfile ? 'Keep exploring!' : 'What an adventurer!'} ^^*`
  ].join('\n');
  
  embed.addFields({
    name: '🌲 🏔️ Adventure Activity',
    value: adventureText,
    inline: true
  });
  
  // Achievements with better formatting
  const achievements = [];
  
  if (userStats.daily_streak >= 7) achievements.push('🌟 Week Warrior');
  if (userStats.daily_streak >= 30) achievements.push('👑 Month Monarch');
  if (userStats.daily_streak >= 100) achievements.push('🏆 Century Streak');
  if (userStats.totalItems >= 25) achievements.push('📦 Collector');
  if (userStats.totalItems >= 100) achievements.push('🎒 Hoarder');
  if (userStats.totalItems >= 250) achievements.push('🏰 Warehouse Manager');
  if (userStats.stats.forages >= 10) achievements.push('🍄 Forest Explorer');
  if (userStats.stats.forages >= 50) achievements.push('🌲 Nature Guardian');
  if (userStats.stats.gifts_sent >= 5) achievements.push('💝 Generous Soul');
  if (userStats.stats.gifts_sent >= 20) achievements.push('🎁 Gift Master');
  if (userStats.rarityCount.epic >= 1) achievements.push('✨ Epic Finder');
  if (userStats.rarityCount.legendary >= 1) achievements.push('🌟 Legend Hunter');
  if (userStats.dream_dust >= 10000) achievements.push('💎 Dream Wealthy');
  
  if (achievements.length > 0) {
    // Split achievements into multiple lines for better readability
    const achievementLines = [];
    for (let i = 0; i < achievements.length; i += 3) {
      achievementLines.push(achievements.slice(i, i + 3).join('  •  '));
    }
    
    embed.addFields({
      name: '🏅 🎉 Achievements Unlocked',
      value: achievementLines.join('\n'),
      inline: false
    });
  } else {
    embed.addFields({
      name: '🏅 🎉 Achievements Unlocked',
      value: '*Keep playing to unlock achievements! Start with `/daily` and `/forage`~ ^^*',
      inline: false
    });
  }
  
  // Footer with cute rotating messages
  const footerMessages = isOwnProfile ? [
    'Keep being lovely~ :3',
    'You\'re doing great! ^^',
    'Such a cozy profile~ >w<',
    'Your collection sparkles! ✨'
  ] : [
    'Such a cozy collection! ^^',
    'What a lovely adventurer~ :3',
    'Their journey looks amazing! >w<',
    'So inspiring! ✨'
  ];
    const randomFooter = footerMessages[Math.floor(Math.random() * footerMessages.length)] || 'Keep being lovely~ :3';
  
  embed.setFooter({
    text: randomFooter
  });
  
  return { embeds: [embed] };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  const targetUser = ctx.interaction.options.getUser('user') || ctx.interaction.user;
  const isOwnProfile = targetUser.id === ctx.interaction.user.id;
  
  try {
    const userStats = await getUserStats(targetUser.id, guildId);
    const response = formatProfile(targetUser, userStats, isOwnProfile);
    
    await ctx.interaction.reply(response);
    
  } catch (error) {
    console.error('Profile command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong checking the profile... >.<');
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
  const targetUser = mentionMatch ? await ctx.message.guild?.members.fetch(targetUserId).then(m => m.user) : ctx.message.author;
  const isOwnProfile = targetUserId === ctx.message.author.id;
  
  try {
    const userStats = await getUserStats(targetUserId, guildId);
    const response = formatProfile(targetUser || { id: targetUserId, displayName: targetUserId }, userStats, isOwnProfile);
    
    await ctx.message.reply(response);
    
  } catch (error) {
    console.error('Profile command error:', error);
    await ctx.message.reply('Eep! S-something went wrong checking the profile... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }

  const targetUser = ctx.message.author;
  
  try {
    const stats = await getUserStats(targetUser.id, guildId);
    const response = formatProfile(targetUser, stats, true);
    
    // For AI commands, we need to return content instead of embeds
    // Convert embed to plain text for AI response
    if (!stats) {
      return { content: 'Y-your profile is... um... empty! Maybe try using some commands first? >.<' };
    }
    
    const joinDate = new Date(stats.created_at).toLocaleDateString();
    const daysSinceJoin = Math.floor((Date.now() - new Date(stats.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    let profileText = `🧸📖 Y-you look so nice! Um... here's your profile, I think... >w<\n\n`;
    profileText += `💰 **Dream Dust:** ${stats.dream_dust.toLocaleString()}\n`;
    profileText += `🔥 **Daily Streak:** ${stats.daily_streak} days\n`;
    profileText += `📦 **Total Items:** ${stats.totalItems}\n`;
    profileText += `📅 **Member since:** ${joinDate} (${daysSinceJoin} days ago)\n\n`;
    profileText += `Keep being lovely~ :3`;
    
    return { content: profileText };
    
  } catch (error) {
    console.error('Profile AI command error:', error);
    return {
      content: 'Eep! S-something went wrong checking the profile... >.<',
    };
  }
};
