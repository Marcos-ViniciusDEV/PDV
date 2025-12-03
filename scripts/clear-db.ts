import { getDb } from "../electron/db/config";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Clearing database tables...");

  const db = await getDb();

  // Disable FK checks
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  // Truncate tables
  try {
    await db.execute(sql`TRUNCATE TABLE sale_items`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE sale_payments`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE return_items`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE returns`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE sales`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE cash_movements`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE caixa_sessions`);
  } catch (e) {}
  
  // New tables (just in case)
  try {
    await db.execute(sql`TRUNCATE TABLE recipe_ingredients`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE recipes`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE materials`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE offers`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE users`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE products`);
  } catch (e) {}
  try {
    await db.execute(sql`TRUNCATE TABLE counters`);
  } catch (e) {}

  // Enable FK checks
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log("Database cleared successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
