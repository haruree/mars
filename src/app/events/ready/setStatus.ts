import type { Client } from 'discord.js';
import { ActivityType, PresenceUpdateStatus } from 'discord.js';

export default function setStatus(client: Client<true>) {
  const serverCount = client.guilds.cache.size;
  
  client.user.setPresence({
    status: PresenceUpdateStatus.DoNotDisturb,
    activities: [
      {
        name: `${serverCount} server${serverCount !== 1 ? 's' : ''}`,
        type: ActivityType.Watching,
      },
    ],
  });
}
