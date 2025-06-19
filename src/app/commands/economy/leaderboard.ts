import type { ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { getLeaderboard, getUserRank, requireGuild } from '../../../database/index.js';

export const command: CommandData = {
  name: 'leaderboard',
  description: 'U-um... these are the top essence collectors... they\'re amazing...! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)',
  options: [
    {
      name: 'limit',
      description: 'Number of top users to show (1-25)',
      type: ApplicationCommandOptionType.Integer,
      min_value: 1,
      max_value: 25,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  try {
    const guildId = requireGuild(ctx.interaction.guildId);
    const limit = ctx.options.getInteger('limit') || 10;

    await ctx.interaction.deferReply();

    // Get leaderboard data
    const leaderboard = await getLeaderboard(guildId, limit);
    const userRank = await getUserRank(ctx.interaction.user.id, guildId);

    if (leaderboard.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('💫 Dream Dust Leaderboard')
        .setDescription('*U-um... it seems no one has collected any dream dust yet... (｡•́︿•̀｡)*\n\nTry using `/daily` or `/forage` to start collecting!')
        .setFooter({ text: 'Come back when there are some collectors to show! ✨' });      await ctx.interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create leaderboard embed
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('💫 Dream Dust Leaderboard')
      .setDescription('*U-um... these are the top essence collectors... they\'re amazing...! (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)*')
      .setTimestamp();

    // Build leaderboard text
    let leaderboardText = '';
    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      const position = i + 1;
      
      // Get medal emoji for top 3
      let medal = '';
      if (position === 1) medal = '🥇';
      else if (position === 2) medal = '🥈';
      else if (position === 3) medal = '🥉';
      else medal = `**${position}.**`;      // Format the entry
      leaderboardText += `${medal} <@${user.id}> • \`${user.dream_dust.toLocaleString()}\` ✨\n`;
    }

    embed.addFields({
      name: '🏆 Top Collectors',
      value: leaderboardText || 'No data available',
      inline: false
    });

    // Add user's rank if they're not in the top list
    if (userRank) {
      const isInTopList = leaderboard.some(user => user.id === ctx.interaction.user.id);
      
      if (!isInTopList && userRank.rank > limit) {
        embed.addFields({
          name: '📍 Your Position',
          value: `**${userRank.rank}.** <@${ctx.interaction.user.id}> • \`${userRank.dream_dust.toLocaleString()}\` ✨\n*Out of ${userRank.total_users} collectors*`,
          inline: false
        });
      } else if (isInTopList) {
        embed.setFooter({ 
          text: `You're ranked #${userRank.rank} out of ${userRank.total_users} collectors! ✨` 
        });
      }
    }

    // Add helpful footer
    if (!embed.data.footer) {
      embed.setFooter({ 
        text: 'Use /daily and /forage to earn more dream dust! ✨' 
      });
    }

    await ctx.interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in leaderboard command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Oops!')
      .setDescription('*S-sorry... something went wrong while checking the leaderboard... (｡•́︿•̀｡)*');

    if (ctx.interaction.deferred) {
      await ctx.interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await ctx.interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
