import { MiddlewareContext, CommandExecutionMode } from 'commandkit';
import { PermissionFlagsBits, PermissionsBitField, GuildMember } from 'discord.js';

// Moderation commands middleware
export default async function(ctx: MiddlewareContext<CommandExecutionMode>, next: () => Promise<void>) {
  // Skip autocomplete interactions
  if (ctx.interaction.isAutocomplete()) {
    return await next();
  }
  
  // Check for permissions
  const member = ctx.interaction.member;
  
  // Ensure member has moderation permissions
  // We'll check for either ModerateMembers or ManageMessages
  const requiredPermissions = [
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages
  ];
  
  // Type guard to ensure member has permissions property
  if (!member || !('permissions' in member)) {
    const emoticons = ['^^;', '>.<', 'x3', ':3', 'uwu'];
    const randomEmoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
    
    return ctx.interaction.reply({
      content: `E-eep! This command can only be used in a server ${randomEmoticon}`,
      ephemeral: true
    });
  }
  
  // Type guard for GuildMember with permissions
  if (member instanceof GuildMember) {
    const hasPermission = requiredPermissions.some(permission => 
      member.permissions.has(permission)
    );
    
    if (!hasPermission) {
      const emoticons = ['>.<', '^^;', 'uwu', ':3', '(>﹏<)'];
      const randomEmoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
      
      return ctx.interaction.reply({
        content: `U-um... I'm sorry but you don't have permission to use moderation commands ${randomEmoticon}`,
        ephemeral: true
      });
    }
  } else {
    const emoticons = ['><', '>.<', ':3', 'uwu', '^-^;'];
    const randomEmoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
    
    return ctx.interaction.reply({
      content: `A-ah! This command can only be used in a server ${randomEmoticon}`,
      ephemeral: true
    });
  }
  
  // If we get here, the user has permission
  await next();
} 