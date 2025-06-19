import type { ChatInputCommand, CommandData } from 'commandkit';
import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js';
import { getUserBalance, updateUserBalance } from '../../../database/index.js';

export const command: CommandData = {
  name: 'coinflip',
  description: 'Flip a coin and bet dream dust! Choose heads or tails 🪙',
  options: [
    {
      name: 'choice',
      description: 'Choose heads or tails',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'heads', value: 'heads' },
        { name: 'tails', value: 'tails' }
      ]
    },
    {
      name: 'amount',
      description: 'Amount of dream dust to bet',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1
    }
  ]
};

export const chatInput: ChatInputCommand = async (ctx) => {
  try {
    const choice = ctx.interaction.options.getString('choice', true);
    const amount = ctx.interaction.options.getInteger('amount', true);
    const userId = ctx.interaction.user.id;
    const guildId = ctx.interaction.guildId!;

    // Check user's balance
    const currentBalance = await getUserBalance(userId, guildId);
      if (currentBalance < amount) {
      await ctx.interaction.reply({ 
        content: `🌸 **${ctx.interaction.user.username}** *you don't have enough dream dust to bet* **${amount}**... *you only have* **${currentBalance}** *(｡•́︿•̀｡)*`
      });
      return;
    }

    // Flip the coin
    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === coinResult;
    
    // Calculate winnings/losses
    const balanceChange = won ? amount : -amount;
    
    // Update balance
    await updateUserBalance(userId, guildId, balanceChange);
    const newBalance = currentBalance + balanceChange;    // Create cute Mars-themed result message
    if (won) {
      await ctx.interaction.reply({ 
        content: `🌸 **${ctx.interaction.user.username}** *spent* 🌸 **${amount}** *and chose* **${choice}**\n*The Mars coin spins...* 🪙 *and you won* 🌸 **${amount * 2}**! *(landed on ${coinResult})* 🌺`
      });
    } else {
      await ctx.interaction.reply({ 
        content: `🌸 **${ctx.interaction.user.username}** *spent* 🌸 **${amount}** *and chose* **${choice}**\n*The Mars coin spins...* 🪙 *and you lost...* *(landed on ${coinResult})* (｡•́︿•̀｡)`
      });
    }
  } catch (error) {
    console.error('Error in coinflip command:', error);
    
    await ctx.interaction.reply({ 
      content: `*S-sorry... something went wrong with the Mars coinflip...* (｡•́︿•̀｡)`,
      ephemeral: true 
    });
  }
};
