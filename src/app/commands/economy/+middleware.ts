import { MiddlewareContext, CommandExecutionMode } from 'commandkit';
import { ApplicationCommandType } from 'discord.js';

// Economy commands middleware
export default async function(ctx: MiddlewareContext<CommandExecutionMode>, next: () => Promise<void>) {
  // Skip autocomplete interactions
  if (ctx.interaction.isAutocomplete()) {
    return await next();
  }
  
  // Check for cooldowns
  const userId = ctx.interaction.user.id;
  const commandName = ctx.commandName;
  
  // Simple in-memory cooldown implementation
  // For production, you'd want to store this in your database
  const cooldowns = new Map();
  
  // Only apply to specific commands that need cooldowns
  const cooldownCommands = ['daily', 'brew', 'forage'];
  const cooldownTimes: Record<string, number> = {
    'daily': 24 * 60 * 60 * 1000, // 24 hours
    'brew': 30 * 60 * 1000,      // 30 minutes
    'forage': 10 * 60 * 1000     // 10 minutes
  };

  if (cooldownCommands.includes(commandName)) {
    const key = `${userId}-${commandName}`;
    const cooldownAmount = cooldownTimes[commandName] || 0;
    
    if (cooldowns.has(key)) {
      const expirationTime = cooldowns.get(key);
      const now = Date.now();
      
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = Math.floor(timeLeft % 60);
        
        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0) timeString += `${minutes}m `;
        if (seconds > 0) timeString += `${seconds}s`;
        
        const emoticons = ['>.<', '^^;', 'uwu', ':3', 'x3'];
        const randomEmoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
        
        return ctx.interaction.reply({ 
          content: `U-um, you need to wait ${timeString.trim()} before using this command again ${randomEmoticon}`,
          ephemeral: true 
        });
      }
    }
    
    cooldowns.set(key, Date.now() + cooldownAmount);
    setTimeout(() => cooldowns.delete(key), cooldownAmount);
  }
  
  await next();
} 