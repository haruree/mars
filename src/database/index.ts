import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export { pool };

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
export async function ensureShopItems(guildId: string): Promise<void> {
  // Check if this guild already has shop items
  const existingQuery = 'SELECT COUNT(*) as count FROM shop_items WHERE guild_id = $1';
  const existingResult = await pool.query(existingQuery, [guildId]);
  const itemCount = parseInt(existingResult.rows[0]?.count || '0');
  
  if (itemCount === 0) {
    // Add default shop items for this guild
    const defaultItems = [
      { name: 'Healing Potion', price: 100, rarity: 'common', category: 'consumable', stock: -1 },
      { name: 'Cozy Blanket', price: 150, rarity: 'common', category: 'cozy', stock: -1 },
      { name: 'Flower Crown', price: 200, rarity: 'uncommon', category: 'decorative', stock: -1 },
      { name: 'Plushie Bear', price: 300, rarity: 'uncommon', category: 'cozy', stock: -1 },
      { name: 'Dream Catcher', price: 500, rarity: 'rare', category: 'decorative', stock: -1 },
      { name: 'Starlight Lamp', price: 750, rarity: 'epic', category: 'decorative', stock: -1 },
      { name: 'Moonbeam Crystal', price: 1000, rarity: 'epic', category: 'decorative', stock: -1 },
      { name: 'Enchanted Rose', price: 1500, rarity: 'legendary', category: 'decorative', stock: -1 },
    ];
    
    for (const item of defaultItems) {
      const insertQuery = `
        INSERT INTO shop_items (guild_id, name, price, rarity, category, stock)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name, guild_id) DO NOTHING
      `;
      await pool.query(insertQuery, [guildId, item.name, item.price, item.rarity, item.category, item.stock]);
    }
  }
}

export async function getShopItems(guildId: string) {
  // Ensure this guild has shop items
  await ensureShopItems(guildId);
  
  const query = `
    SELECT s.name, s.price, s.description, s.rarity, s.category, ic.emoji
    FROM shop_items s
    LEFT JOIN items_catalog ic ON s.name = ic.name
    WHERE s.guild_id = $1
    AND (s.available_until IS NULL OR s.available_until > NOW())
    AND (s.stock > 0 OR s.stock = -1)
    ORDER BY s.rarity, s.price
  `;
  const result = await pool.query(query, [guildId]);
  return result.rows;
}

export async function getShopItem(guildId: string, itemName: string) {
  // Ensure this guild has shop items
  await ensureShopItems(guildId);
  
  const query = `
    SELECT s.name, s.price, s.description, s.rarity, s.category, s.stock, ic.emoji
    FROM shop_items s
    LEFT JOIN items_catalog ic ON s.name = ic.name
    WHERE s.guild_id = $1 AND LOWER(s.name) = LOWER($2)
    AND (s.available_until IS NULL OR s.available_until > NOW())
    AND (s.stock > 0 OR s.stock = -1)
  `;
  const result = await pool.query(query, [guildId, itemName]);
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
