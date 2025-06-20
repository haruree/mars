import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export { pool };

// Database initialization function
export async function initializeDatabase(): Promise<void> {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');
    
    // Migrate to global shop
    await migrateToGlobalShop();
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Guild settings functions
export async function getGuildPrefix(guildId: string): Promise<string> {
  // Create the guild settings if they don't exist
  await ensureGuildSettings(guildId);
  
  // Get the prefix
  const query = 'SELECT prefix FROM guild_settings WHERE guild_id = $1';
  const result = await pool.query(query, [guildId]);
  
  // Return the prefix or the default if not found
  return result.rows[0]?.prefix || ',';
}

export async function setGuildPrefix(guildId: string, prefix: string): Promise<void> {
  // Ensure guild settings exist
  await ensureGuildSettings(guildId);
  
  // Update the prefix
  const query = `
    UPDATE guild_settings 
    SET prefix = $1, updated_at = NOW() 
    WHERE guild_id = $2
  `;
  await pool.query(query, [prefix, guildId]);
}

export async function ensureGuildSettings(guildId: string): Promise<void> {
  const query = `
    INSERT INTO guild_settings (guild_id) 
    VALUES ($1) 
    ON CONFLICT (guild_id) DO NOTHING
  `;
  await pool.query(query, [guildId]);
}

// Migration function to convert guild-specific shops to global shop
export async function migrateToGlobalShop(): Promise<void> {
  try {
    // Clean up any non-global shop items first
    const cleanupQuery = 'DELETE FROM shop_items WHERE guild_id != $1';
    const cleanupResult = await pool.query(cleanupQuery, ['global']);
    if (cleanupResult.rowCount && cleanupResult.rowCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupResult.rowCount} old guild-specific shop items`);
    }
    
    // Check if global shop already exists
    const globalShopQuery = 'SELECT COUNT(*) as count FROM shop_items WHERE guild_id = $1';
    const globalShopResult = await pool.query(globalShopQuery, ['global']);
    const globalItemCount = parseInt(globalShopResult.rows[0]?.count || '0');
    
    if (globalItemCount === 0) {
      console.log('🔄 Creating global shop...');
      // Ensure global shop items exist
      await ensureShopItems();
    }
    
  } catch (error) {
    console.error('❌ Shop migration failed:', error);
  }
}

// Helper function to ensure guild context
export function requireGuild(guildId: string | null): string {
  if (!guildId) {
    throw new Error('This command can only be used in a server!');
  }
  return guildId;
}

// User management functions
export async function ensureUser(userId: string, guildId: string): Promise<void> {
  const query = `
    INSERT INTO users (id, guild_id, dream_dust) 
    VALUES ($1, $2, 0) 
    ON CONFLICT (id, guild_id) DO NOTHING
  `;
  await pool.query(query, [userId, guildId]);
}

export async function getUserBalance(userId: string, guildId: string): Promise<number> {
  await ensureUser(userId, guildId);
  const query = 'SELECT dream_dust FROM users WHERE id = $1 AND guild_id = $2';
  const result = await pool.query(query, [userId, guildId]);
  return result.rows[0]?.dream_dust || 0;
}

export async function updateUserBalance(userId: string, guildId: string, amount: number): Promise<void> {
  await ensureUser(userId, guildId);
  const query = 'UPDATE users SET dream_dust = dream_dust + $1 WHERE id = $2 AND guild_id = $3';
  await pool.query(query, [amount, userId, guildId]);
}

export async function setUserBalance(userId: string, guildId: string, amount: number): Promise<void> {
  await ensureUser(userId, guildId);
  const query = 'UPDATE users SET dream_dust = $1 WHERE id = $2 AND guild_id = $3';
  await pool.query(query, [amount, userId, guildId]);
}

// Inventory management functions
export async function getUserInventory(userId: string, guildId: string) {
  await ensureUser(userId, guildId);
  const query = `
    SELECT i.item_name, i.amount, ic.description, ic.emoji, ic.rarity
    FROM inventory i
    LEFT JOIN items_catalog ic ON i.item_name = ic.name
    WHERE i.user_id = $1 AND i.guild_id = $2 AND i.amount > 0
    ORDER BY ic.rarity, i.item_name
  `;
  const result = await pool.query(query, [userId, guildId]);
  return result.rows;
}

export async function getItemAmount(userId: string, guildId: string, itemName: string): Promise<number> {
  await ensureUser(userId, guildId);
  const query = 'SELECT amount FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_name = $3';
  const result = await pool.query(query, [userId, guildId, itemName]);
  return result.rows[0]?.amount || 0;
}

export async function addItemToInventory(userId: string, guildId: string, itemName: string, amount: number): Promise<void> {
  await ensureUser(userId, guildId);
  
  // First check if row exists
  const checkQuery = 'SELECT amount FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_name = $3';
  const existing = await pool.query(checkQuery, [userId, guildId, itemName]);
  
  if (existing.rows.length > 0) {
    // Update existing
    const updateQuery = 'UPDATE inventory SET amount = amount + $1 WHERE user_id = $2 AND guild_id = $3 AND item_name = $4';
    await pool.query(updateQuery, [amount, userId, guildId, itemName]);
  } else {
    // Insert new
    const insertQuery = 'INSERT INTO inventory (user_id, guild_id, item_name, amount) VALUES ($1, $2, $3, $4)';
    await pool.query(insertQuery, [userId, guildId, itemName, amount]);
  }
}

export async function removeItemFromInventory(userId: string, guildId: string, itemName: string, amount: number): Promise<boolean> {
  await ensureUser(userId, guildId);
  const currentAmount = await getItemAmount(userId, guildId, itemName);
  
  if (currentAmount < amount) {
    return false; // Not enough items
  }
  
  const query = 'UPDATE inventory SET amount = amount - $1 WHERE user_id = $2 AND guild_id = $3 AND item_name = $4';
  await pool.query(query, [amount, userId, guildId, itemName]);
  return true;
}

// Shop functions
export async function ensureShopItems(): Promise<void> {
  // Check if global shop items exist (not guild-specific)
  const existingQuery = 'SELECT COUNT(*) as count FROM shop_items WHERE guild_id = $1';
  const existingResult = await pool.query(existingQuery, ['global']);
  const itemCount = parseInt(existingResult.rows[0]?.count || '0');
  
  if (itemCount === 0) {
    // Get default shop items from items_catalog
    const catalogQuery = `
      SELECT name, sell_value * 2 as price, rarity, category 
      FROM items_catalog 
      WHERE category IN ('consumable', 'cozy', 'decorative')
      ORDER BY rarity, name
    `;
    const catalogResult = await pool.query(catalogQuery);
    
    for (const item of catalogResult.rows) {
      const insertQuery = `
        INSERT INTO shop_items (guild_id, name, price, rarity, category, stock)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name, guild_id) DO NOTHING
      `;
      await pool.query(insertQuery, ['global', item.name, item.price, item.rarity, item.category, -1]);
    }
  }
}

export async function getShopItems() {
  // Ensure global shop items exist
  await ensureShopItems();
  
  const query = `
    SELECT s.name, s.price, s.description, s.rarity, s.category, ic.emoji
    FROM shop_items s
    LEFT JOIN items_catalog ic ON s.name = ic.name
    WHERE s.guild_id = $1
    AND (s.available_until IS NULL OR s.available_until > NOW())
    AND (s.stock > 0 OR s.stock = -1)
    ORDER BY s.price DESC
  `;
  const result = await pool.query(query, ['global']);
  return result.rows;
}

export async function getShopItem(itemName: string) {
  // Ensure global shop items exist
  await ensureShopItems();
  
  const query = `
    SELECT s.name, s.price, s.description, s.rarity, s.category, s.stock, ic.emoji
    FROM shop_items s
    LEFT JOIN items_catalog ic ON s.name = ic.name
    WHERE s.guild_id = $1 AND LOWER(s.name) = LOWER($2)
    AND (s.available_until IS NULL OR s.available_until > NOW())
    AND (s.stock > 0 OR s.stock = -1)
  `;
  const result = await pool.query(query, ['global', itemName]);
  return result.rows[0] || null;
}

export async function getItemInfo(itemName: string) {
  const query = 'SELECT * FROM items_catalog WHERE name = $1';
  const result = await pool.query(query, [itemName]);
  return result.rows[0] || null;
}

// Daily/Forage cooldown functions
export async function getLastDaily(userId: string, guildId: string): Promise<Date | null> {
  await ensureUser(userId, guildId);
  const query = 'SELECT last_daily FROM users WHERE id = $1 AND guild_id = $2';
  const result = await pool.query(query, [userId, guildId]);
  return result.rows[0]?.last_daily || null;
}

export async function updateLastDaily(userId: string, guildId: string): Promise<void> {
  const query = 'UPDATE users SET last_daily = NOW(), daily_streak = daily_streak + 1 WHERE id = $1 AND guild_id = $2';
  await pool.query(query, [userId, guildId]);
}

export async function getLastForage(userId: string, guildId: string): Promise<Date | null> {
  await ensureUser(userId, guildId);
  const query = 'SELECT last_forage FROM users WHERE id = $1 AND guild_id = $2';
  const result = await pool.query(query, [userId, guildId]);
  return result.rows[0]?.last_forage || null;
}

export async function updateLastForage(userId: string, guildId: string): Promise<void> {
  const query = 'UPDATE users SET last_forage = NOW() WHERE id = $1 AND guild_id = $2';
  await pool.query(query, [userId, guildId]);
}

// Recipe functions
export async function getRecipes() {
  const query = `
    SELECT r.name, r.result_item, r.result_amount, r.description,
           JSON_AGG(JSON_BUILD_OBJECT('name', ri.ingredient_name, 'amount', ri.amount_needed)) as ingredients
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    GROUP BY r.id, r.name, r.result_item, r.result_amount, r.description
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getRecipeByName(recipeName: string) {
  const query = `
    SELECT r.name, r.result_item, r.result_amount, r.description,
           JSON_AGG(JSON_BUILD_OBJECT('name', ri.ingredient_name, 'amount', ri.amount_needed)) as ingredients
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE LOWER(r.name) = LOWER($1)
    GROUP BY r.id, r.name, r.result_item, r.result_amount, r.description
  `;
  const result = await pool.query(query, [recipeName]);
  return result.rows[0] || null;
}

// Transaction logging
export async function logTransaction(userId: string, guildId: string, type: string, amount?: number, itemName?: string, description?: string): Promise<void> {
  const query = `
    INSERT INTO transactions (user_id, guild_id, type, amount, item_name, description)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await pool.query(query, [userId, guildId, type, amount, itemName, description]);
}

// Database cleanup and maintenance functions
export async function cleanupOldTransactions(daysOld: number = 90): Promise<void> {
  const query = `
    DELETE FROM transactions 
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
  `;
  const result = await pool.query(query);
  console.log(`🧹 Cleaned up ${result.rowCount} old transactions`);
}

export async function getDatabaseStats(): Promise<any> {
  const queries = [
    { name: 'Total Users', query: 'SELECT COUNT(*) as count FROM users' },
    { name: 'Total Items in Circulation', query: 'SELECT SUM(amount) as count FROM inventory' },
    { name: 'Total Transactions', query: 'SELECT COUNT(*) as count FROM transactions' },
    { name: 'Active Guilds', query: 'SELECT COUNT(DISTINCT guild_id) as count FROM users' },
  ];

  const stats: Record<string, number> = {};
  
  for (const { name, query } of queries) {
    try {
      const result = await pool.query(query);
      stats[name] = parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      console.error(`Error getting stat ${name}:`, error);
      stats[name] = 0;
    }
  }
  
  return stats;
}

// Leaderboard functions
export async function getLeaderboard(guildId: string, limit: number = 10) {
  const query = `
    SELECT id, dream_dust, daily_streak
    FROM users 
    WHERE guild_id = $1 AND dream_dust > 0
    ORDER BY dream_dust DESC 
    LIMIT $2
  `;
  const result = await pool.query(query, [guildId, limit]);
  return result.rows;
}

export async function getUserRank(userId: string, guildId: string): Promise<{ rank: number; dream_dust: number; total_users: number } | null> {
  // Get user's position in the leaderboard
  const rankQuery = `
    WITH ranked_users AS (
      SELECT id, dream_dust, 
             ROW_NUMBER() OVER (ORDER BY dream_dust DESC) as rank
      FROM users 
      WHERE guild_id = $1 AND dream_dust > 0
    ),
    total_count AS (
      SELECT COUNT(*) as total FROM users WHERE guild_id = $1 AND dream_dust > 0
    )
    SELECT ru.rank, ru.dream_dust, tc.total as total_users
    FROM ranked_users ru, total_count tc
    WHERE ru.id = $2
  `;
  const result = await pool.query(rankQuery, [guildId, userId]);
  return result.rows[0] || null;
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}
