
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./electron/db/schema";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/pdv_local";
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  console.log("Checking Sessions...");
  const sessions = await db.select().from(schema.caixaSessions);
  sessions.forEach(s => {
    console.log(`Session ${s.id}: Initial Amount = ${s.initialAmount}`);
  });

  console.log("\nChecking Movements...");
  const movements = await db.select().from(schema.cashMovements);
  movements.forEach(m => {
    console.log(`Movement ${m.type}: ${m.amount} (${m.reason})`);
  });

  await connection.end();
}

main().catch(console.error);
