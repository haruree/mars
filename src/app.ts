import { Client } from 'discord.js';
import { initializeDatabase, closeDatabase } from './database/index.js';
import './ai.ts';

const client = new Client({
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

// Initialize database when client is ready
client.once('ready', async () => {
  console.log('🤖 Bot is starting up...');
  try {
    await initializeDatabase();
    console.log('✅ Bot initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

export default client;
