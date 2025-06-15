import type { Client } from 'discord.js';
import { ActivityType, PresenceUpdateStatus } from 'discord.js';
import { Logger } from 'commandkit';

export default function setStatus(client: Client<true>) {
  const serverCount = client.guilds.cache.size;
  
  // Set the bot's presence to DND with custom status
  client.user.setPresence({
    status: PresenceUpdateStatus.DoNotDisturb,
    activities: [
      {
        name: `I'm on ${serverCount} server${serverCount !== 1 ? 's' : ''}`,
        type: ActivityType.Custom,
      },
    ],
  });

  Logger.info(`Bot status set to DND - Active on ${serverCount} server${serverCount !== 1 ? 's' : ''}`);
}
