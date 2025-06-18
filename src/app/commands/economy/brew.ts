import type { ChatInputCommand, MessageCommand, CommandData } from 'commandkit';
import type { AiCommand, AiConfig } from 'commandkit/ai';
import { ApplicationCommandOptionType } from 'discord.js';
import { z } from 'zod';
import { 
  getRecipes,
  getRecipeByName,
  getItemAmount,
  removeItemFromInventory,
  addItemToInventory,
  logTransaction
} from '../../../database/index.js';

export const command: CommandData = {
  name: 'brew',
  description: 'Combine items to create something magical~ 🧪🍯🔮',
  options: [
    {
      name: 'recipe',
      description: 'The name of the recipe to brew (leave empty to see all recipes)',
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
  ],
};

export const aiConfig = {
  parameters: z.object({
    recipe: z.string().optional().describe('The name of the recipe to brew'),
  }),
} satisfies AiConfig;

function formatRecipes(recipes: any[]) {
  if (recipes.length === 0) {
    return `🧪🍯🔮 Um... I don't know any recipes right now... s-sorry! >.<`;
  }
  
  let recipesText = `🧪🍯🔮 W-would you like me to try making something with your ingredients...? >///<\n\n`;
  
  for (const recipe of recipes) {
    recipesText += `✨ **${recipe.name}**\n`;
    recipesText += `   → Creates: **${recipe.result_amount}x ${recipe.result_item}**\n`;
    
    if (recipe.description) {
      recipesText += `   _${recipe.description}_\n`;
    }
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipesText += `   **Ingredients:**\n`;
      for (const ingredient of recipe.ingredients) {
        if (ingredient.name && ingredient.amount) {
          recipesText += `   • ${ingredient.amount}x ${ingredient.name}\n`;
        }
      }
    }
    recipesText += '\n';
  }
  
  recipesText += `💡 Use \`/brew <recipe name>\` to create something magical~ ^^`;
  
  return recipesText;
}

async function brewRecipe(userId: string, guildId: string, recipeName: string) {
  const recipe = await getRecipeByName(recipeName);
  
  if (!recipe) {
    return {
      success: false,
      error: `Um... I don't know how to make "${recipeName}"... s-sorry! >.<`
    };
  }
  
  // Check if user has all ingredients
  const missingIngredients: string[] = [];
  
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    for (const ingredient of recipe.ingredients) {
      if (ingredient.name && ingredient.amount) {
        const userAmount = await getItemAmount(userId, guildId, ingredient.name);
        if (userAmount < ingredient.amount) {
          missingIngredients.push(`${ingredient.amount - userAmount} more ${ingredient.name}`);
        }
      }
    }
  }
  
  if (missingIngredients.length > 0) {
    return {
      success: false,
      error: `Eep! You're missing: **${missingIngredients.join(', ')}**... maybe try foraging? ^^;`
    };
  }
  
  // Remove ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    for (const ingredient of recipe.ingredients) {
      if (ingredient.name && ingredient.amount) {
        const removed = await removeItemFromInventory(userId, guildId, ingredient.name, ingredient.amount);
        if (!removed) {
          return {
            success: false,
            error: `S-something went wrong removing ${ingredient.name}... >.<`
          };
        }
      }
    }
  }
    // Add result
  await addItemToInventory(userId, guildId, recipe.result_item, recipe.result_amount);
  await logTransaction(userId, guildId, 'brew', undefined, recipe.result_item, `Brewed ${recipe.result_amount}x ${recipe.result_item}`);
  
  return {
    success: true as const,
    recipe
  };
}

export const chatInput: ChatInputCommand = async (ctx) => {
  const guildId = ctx.interaction.guildId;
  
  if (!guildId) {
    await ctx.interaction.reply('❌ This command can only be used in a server!');
    return;
  }

  const recipeName = ctx.options.getString('recipe');
  const userId = ctx.interaction.user.id;
  
  try {
    if (!recipeName) {
      // Show all recipes
      const recipes = await getRecipes();
      const response = formatRecipes(recipes);
      await ctx.interaction.reply(response);
      return;
    }
    
    const result = await brewRecipe(userId, guildId, recipeName);
    
    if (!result.success) {
      await ctx.interaction.reply(result.error!);
      return;
    }
    
    const responses = [
      `🧪✨ Y-yay! I managed to brew it without any accidents! >w<\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `🔮🍯 Eep! The brewing worked perfectly... I'm so proud! ^^;\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `✨🧪 W-wow! Look what we made together... it's beautiful! :3\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.interaction.reply(randomResponse);
    
  } catch (error) {
    console.error('Brew command error:', error);
    await ctx.interaction.reply('Eep! S-something went wrong with the brewing... >.<');
  }
};

export const message: MessageCommand = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    await ctx.message.reply('❌ This command can only be used in a server!');
    return;
  }

  const args = ctx.message.content.split(' ').slice(1);
  const recipeName = args.join(' ');
  const userId = ctx.message.author.id;
  
  try {
    if (!recipeName.trim()) {
      // Show all recipes
      const recipes = await getRecipes();
      const response = formatRecipes(recipes);
      await ctx.message.reply(response);
      return;
    }
    
    const result = await brewRecipe(userId, guildId, recipeName);
    
    if (!result.success) {
      await ctx.message.reply(result.error!);
      return;
    }
    
    const responses = [
      `🧪✨ Y-yay! I managed to brew it without any accidents! >w<\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `🔮🍯 Eep! The brewing worked perfectly... I'm so proud! ^^;\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `✨🧪 W-wow! Look what we made together... it's beautiful! :3\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    await ctx.message.reply(randomResponse);
    
  } catch (error) {
    console.error('Brew command error:', error);
    await ctx.message.reply('Eep! S-something went wrong with the brewing... >.<');
  }
};

export const ai: AiCommand<typeof aiConfig> = async (ctx) => {
  const guildId = ctx.message.guildId;
  
  if (!guildId) {
    return {
      content: '❌ This command can only be used in a server!',
    };
  }
  const userId = ctx.message.author.id;
  const args = ctx.message.content.split(' ').slice(1);
  const recipeName = args[0];
  
  if (!recipeName) {
    return {
      content: '🧪✨ Please tell me which recipe you\'d like to brew! >w<',
    };
  }
  
  try {
    const result = await brewRecipe(userId, guildId, recipeName);
    
    if (!result.success) {
      return { content: result.error! };
    }
    
    const responses = [
      `🧪✨ Y-yay! I managed to brew it without any accidents! >w<\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `🔮🍯 Eep! The brewing worked perfectly... I'm so proud! ^^;\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`,
      `✨🧪 W-wow! Look what we made together... it's beautiful! :3\n\nCreated **${result.recipe.result_amount}x ${result.recipe.result_item}**!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]!;
    return { content: randomResponse };
    
  } catch (error) {
    console.error('Brew AI command error:', error);
    return {
      content: 'Eep! S-something went wrong with the brewing... >.<',
    };
  }
};

export const autocomplete = async (ctx: any) => {
  const focusedOption = ctx.interaction.options.getFocused(true);
  
  if (focusedOption.name === 'recipe') {
    try {
      // Get all available recipes
      const recipes = await getRecipes();
      
      // Filter recipes based on what user is typing
      const filtered = recipes
        .filter(recipe => 
          recipe.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        )
        .slice(0, 25) // Discord allows max 25 autocomplete options
        .map(recipe => ({
          name: `🧪 ${recipe.name} → ${recipe.result_amount}x ${recipe.result_item}`,
          value: recipe.name
        }));
      
      await ctx.interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await ctx.interaction.respond([]);
    }
  }
};
