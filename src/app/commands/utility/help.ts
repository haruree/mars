import type { ChatInputCommand, CommandData } from 'commandkit';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export const command: CommandData = {
  name: 'help',
  description: 'Use the menu below to learn more about my commands~ 🌸',
};

export const chatInput: ChatInputCommand = async (ctx) => {
  try {    // Create the main help embed
    const mainEmbed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setAuthor({ 
        name: 'help', 
        iconURL: ctx.interaction.client.user.displayAvatarURL() 
      })
      .setDescription('Use the menu below to see my commands~ (｡◕‿◕｡)')
      .setFooter({ text: 'hehe~ (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧' });

    // Create the dropdown menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('select an option')
      .addOptions([
        {
          label: 'economy',
          description: 'Dream dust, shop, inventory commands',
          emoji: '💰',
          value: 'economy'
        },
        {
          label: 'utility',
          description: 'Helpful utility commands',
          emoji: '🔧',
          value: 'utility'
        },
        {
          label: 'moderation',
          description: 'Server moderation commands',
          emoji: '🛡️',
          value: 'moderation'
        },
        {
          label: 'roleplay',
          description: 'Interact with other members',
          emoji: '🎭',
          value: 'roleplay'
        },
        {
          label: 'fun',
          description: 'Fun and entertainment commands',
          emoji: '🎉',
          value: 'fun'
        }
      ]);    // Create action buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('commands')
          .setStyle(ButtonStyle.Link)
          .setURL('https://mars-website-five.vercel.app/commands'),
        new ButtonBuilder()
          .setLabel('support')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/your-support'), // Replace with your actual support server URL
        new ButtonBuilder()
          .setLabel('website')
          .setStyle(ButtonStyle.Link)
          .setURL('https://mars-website-five.vercel.app')
      );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    const response = await ctx.interaction.reply({
      embeds: [mainEmbed],
      components: [selectRow, buttons],
      fetchReply: true
    });

    // Handle dropdown interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.user.id !== ctx.interaction.user.id) {
        await selectInteraction.reply({
          content: '*S-sorry... only the person who used the help command can use this menu... (｡•́︿•̀｡)*',
          ephemeral: true
        });
        return;
      }

      const category = selectInteraction.values[0];
      let embed: EmbedBuilder;

      switch (category) {        case 'economy':
          embed = new EmbedBuilder()
            .setColor('#FFB6C1')
            .setTitle('💰 Economy Commands')
            .setDescription('*H-here are all the dream dust related commands... (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)*\n\n`/balance [user]`\n`/daily`\n`/forage`\n`/shop`\n`/buy <item>`\n`/inventory [user]`\n`/sell <item> [amount]`\n`/gift <user> <item> [amount]`\n`/profile [user]`\n`/leaderboard [limit]`\n`/brew [recipe]`\n`/coinflip <choice> <amount>`')
            .setFooter({ text: 'Type `/help <command>` for more info on a command! ✨' });
          break;case 'utility':
          embed = new EmbedBuilder()
            .setColor('#87CEEB')
            .setTitle('🔧 Utility Commands')
            .setDescription('*U-um... these are some helpful utility commands... (◕‿◕)*\n\n`/ping`\n`/weather <location>`\n`/poll <question> <options...>`')
            .setFooter({ text: 'Type `/help <command>` for more info on a command! ✨' });
          break;        case 'moderation':
          embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🛡️ Moderation Commands')
            .setDescription('*T-these are for server moderators... please use them responsibly... (｡•́︿•̀｡)*\n\n`/purge <amount> [user]`\n`/channel <action> [options]`')
            .setFooter({ text: 'These commands require proper permissions! ⚠️' });
          break;
        case 'roleplay':
          embed = new EmbedBuilder()
            .setColor('#DA70D6')
            .setTitle('🎭 Roleplay Commands')
            .setDescription('*I-interact with other members... it\'s fun! (⁄ ⁄>⁄ ω ⁄<⁄ ⁄)*\n\n`/hug <user>`\n`/kiss <user>`\n`/pat <user>`\n`/poke <user>`\n`/slap <user>`\n`/bite <user>`\n`/boop <user>`\n`/cuddle <user>`\n`/highfive <user>`\n`/handholding <user>`\n`/tickle <user>`\n`/wave <user>`\n`/bully <user>`\n`/snuggle <user>`\n`/greet <user>`\n`/punch <user>`\n`/lick <user>`\n`/nom <user>`\n`/stare <user>`\n`/hold <user>`\n`/pats <user>`\n`/kill <user>`')
            .setFooter({ text: 'All roleplay commands include cute anime GIFs! ✨' });
          break;
        case 'fun':
          embed = new EmbedBuilder()
            .setColor('#98FB98')
            .setTitle('🎉 Fun Commands')
            .setDescription('*F-fun commands for entertainment... I hope you enjoy them! (＾◡＾)*\n\n*More fun commands coming soon!*')
            .setFooter({ text: 'More fun commands coming soon! 🌟' });
          break;

        default:
          embed = mainEmbed;
      }

      await selectInteraction.update({
        embeds: [embed],
        components: [selectRow, buttons]
      });
    });

    collector.on('end', async () => {
      // Disable the select menu when collector expires
      const disabledSelectMenu = StringSelectMenuBuilder.from(selectMenu)
        .setDisabled(true);
      
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(disabledSelectMenu);

      try {
        await ctx.interaction.editReply({
          components: [disabledRow, buttons]
        });
      } catch (error) {
        // Ignore errors if message was already deleted
      }
    });

  } catch (error) {
    console.error('Error in help command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Oops!')
      .setDescription('*S-sorry... something went wrong with the help menu... (｡•́︿•̀｡)*');

    if (ctx.interaction.deferred) {
      await ctx.interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await ctx.interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
