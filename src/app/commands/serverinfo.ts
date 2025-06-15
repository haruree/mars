import type { CommandData, ChatInputCommand } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { z } from 'zod';

export const command: CommandData = {
  name: 'serverinfo',
  description: 'Show server information and statistics',
};

export const aiConfig = {
  parameters: z
    .object({})
    .describe('Show server information and statistics'),
} satisfies AiConfig;

function getVerificationLevel(level: number): string {
  const levels = ['None', 'Low', 'Medium', 'High', 'Very High'];
  return levels[level] || 'Unknown';
}

function getBoostLevel(level: number): string {
  return `${level}/3 boosts`;
}

export const chatInput: ChatInputCommand = async (ctx) => {
  if (!ctx.interaction.inGuild()) {
    await ctx.interaction.reply({
      content: 'This command only works in servers!',
      ephemeral: true
    });
    return;
  }
  const guild = ctx.interaction.guild!;
  await guild.fetch(); // Fetch full guild data
  
  const owner = await guild.fetchOwner();
  const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
  
  // Channel counts
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
  const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
  const totalChannels = guild.channels.cache.size;
  
  // Member counts
  const totalMembers = guild.memberCount;
  const botMembers = guild.members.cache.filter(m => m.user.bot).size;
  const humanMembers = totalMembers - botMembers;
  
  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setColor(0x7289da)
    .setDescription(`Server created <t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)\n${guild.name} is on bot shard ID: **${guild.shardId || 0}**`)
    .addFields(
      {
        name: 'Owner',
        value: `${owner.user.username}`,
        inline: true
      },
      {
        name: 'Members',
        value: `**Total:** ${totalMembers.toLocaleString()}\n**Humans:** ${humanMembers.toLocaleString()}\n**Bots:** ${botMembers}`,
        inline: true
      },
      {
        name: 'Information',
        value: `**Verification:** ${getVerificationLevel(guild.verificationLevel)}\n**Level:** ${getBoostLevel(guild.premiumTier)}`,
        inline: true
      },
      {
        name: 'Design',
        value: `**Banner:** ${guild.bannerURL() ? 'Yes' : 'N/A'}\n**Splash:** ${guild.splashURL() ? 'Yes' : 'N/A'}\n**Icon:** ${guild.iconURL() ? 'Yes' : 'N/A'}`,
        inline: true
      },
      {
        name: `Channels (${totalChannels})`,
        value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Category:** ${categoryChannels}`,
        inline: true
      },
      {
        name: 'Counts',
        value: `**Roles:** ${guild.roles.cache.size}/${guild.roles.cache.size}\n**Emojis:** ${guild.emojis.cache.size}/50\n**Boosters:** ${guild.premiumSubscriptionCount || 0}`,
        inline: true
      }
    )
    .setTimestamp();

  await ctx.interaction.reply({ embeds: [embed] });
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  if (!ctx.message.inGuild()) {
    return {
      error: 'Server info only works in servers, bestie',
    };
  }
  const guild = ctx.message.guild!;
  await guild.fetch(); // Fetch full guild data
  
  const owner = await guild.fetchOwner();
  const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
  
  // Channel counts
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
  const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
  const totalChannels = guild.channels.cache.size;
  
  // Member counts
  const totalMembers = guild.memberCount;
  const botMembers = guild.members.cache.filter(m => m.user.bot).size;
  const humanMembers = totalMembers - botMembers;
  
  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setColor(0x7289da)
    .setDescription(`Server created <t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)\n${guild.name} is on bot shard ID: **${guild.shardId || 0}**`)
    .addFields(
      {
        name: 'Owner',
        value: `${owner.user.username}`,
        inline: true
      },
      {
        name: 'Members',
        value: `**Total:** ${totalMembers.toLocaleString()}\n**Humans:** ${humanMembers.toLocaleString()}\n**Bots:** ${botMembers}`,
        inline: true
      },
      {
        name: 'Information',
        value: `**Verification:** ${getVerificationLevel(guild.verificationLevel)}\n**Level:** ${getBoostLevel(guild.premiumTier)}`,
        inline: true
      },
      {
        name: 'Design',
        value: `**Banner:** ${guild.bannerURL() ? 'Yes' : 'N/A'}\n**Splash:** ${guild.splashURL() ? 'Yes' : 'N/A'}\n**Icon:** ${guild.iconURL() ? 'Yes' : 'N/A'}`,
        inline: true
      },
      {
        name: `Channels (${totalChannels})`,
        value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Category:** ${categoryChannels}`,
        inline: true
      },
      {
        name: 'Counts',
        value: `**Roles:** ${guild.roles.cache.size}/${guild.roles.cache.size}\n**Emojis:** ${guild.emojis.cache.size}/50\n**Boosters:** ${guild.premiumSubscriptionCount || 0}`,
        inline: true
      }
    )
    .setTimestamp();

  await ctx.message.channel.send({ embeds: [embed] });
};
