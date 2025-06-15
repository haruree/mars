import type { CommandData, ChatInputCommand } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { EmbedBuilder, version as djsVersion } from 'discord.js';
import { z } from 'zod';

export const command: CommandData = {
  name: 'botinfo',
  description: 'Show bot information and statistics',
};

export const aiConfig = {
  parameters: z
    .object({})
    .describe('Show bot information and statistics'),
} satisfies AiConfig;

function formatUptime(uptime: number): string {
  const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
  const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)}MB`;
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const client = ctx.interaction.client;
  const uptime = client.uptime || 0;
  const memoryUsage = process.memoryUsage();
  
  const embed = new EmbedBuilder()
    .setTitle('Mars Bot Information')
    .setThumbnail(client.user?.displayAvatarURL() || null)
    .setColor(0x7289da)
    .addFields(
      {
        name: 'Developers',
        value: '`haru`',
        inline: true
      },
      {
        name: 'Commands',
        value: `\`7\``,
        inline: true
      },
      {
        name: 'Guilds',
        value: `\`${client.guilds.cache.size.toLocaleString()}\``,
        inline: true
      },
      {
        name: 'Users',
        value: `\`${client.users.cache.size.toLocaleString()}\``,
        inline: true
      },
      {
        name: 'Memory',
        value: `\`${formatMemory(memoryUsage.heapUsed)} Used\``,
        inline: true
      },
      {
        name: 'Uptime',
        value: `\`${formatUptime(uptime)}\``,
        inline: true
      },
      {
        name: 'Library',
        value: `\`Discord.js v${djsVersion}\``,
        inline: true
      },
      {
        name: 'Node.js',
        value: `\`${process.version}\``,
        inline: true
      },
      {
        name: 'Platform',
        value: `\`${process.platform}\``,
        inline: true
      }
    )
    .setTimestamp();

  await ctx.interaction.reply({ embeds: [embed] });
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  if (!ctx.message.inGuild()) {
    return {
      error: 'Bot info only works in servers',
    };
  }

  const client = ctx.message.client;
  const uptime = client.uptime || 0;
  const memoryUsage = process.memoryUsage();
    const embed = new EmbedBuilder()
    .setTitle('Mars Bot Information')
    .setThumbnail(client.user?.displayAvatarURL() || null)
    .setColor(0x7289da)
    .addFields(
      {
        name: 'Developers',
        value: '`haru`',
        inline: true
      },
      {
        name: 'Commands',
        value: `\`7\``,
        inline: true
      },
      {
        name: 'Guilds',
        value: `\`${client.guilds.cache.size.toLocaleString()}\``,
        inline: true
      },
      {
        name: 'Users',
        value: `\`${client.users.cache.size.toLocaleString()}\``,
        inline: true
      },
      {
        name: 'Memory',
        value: `\`${formatMemory(memoryUsage.heapUsed)} Used\``,
        inline: true
      },
      {
        name: 'Uptime',
        value: `\`${formatUptime(uptime)}\``,
        inline: true
      },
      {
        name: 'Library',
        value: `\`Discord.js v${djsVersion}\``,
        inline: true
      },
      {
        name: 'Node.js',
        value: `\`${process.version}\``,
        inline: true
      },
      {
        name: 'Platform',
        value: `\`${process.platform}\``,
        inline: true
      }
    )
    .setTimestamp();

  await ctx.message.channel.send({ embeds: [embed] });
};
