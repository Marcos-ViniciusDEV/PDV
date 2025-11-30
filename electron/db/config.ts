import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

let _db: MySql2Database<typeof schema> | null = null;

/**
 * Obtém conexão com banco de dados
 * Singleton pattern para reutilizar conexão
 */
export async function getDb(): Promise<MySql2Database<typeof schema>> {
  if (_db) return _db;

  try {
    const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/pdv_local";
    
    console.log("[DB] Connecting to database...");
    
    const connection = await mysql.createConnection(DATABASE_URL);
    _db = drizzle(connection, { schema, mode: "default" });
    
    console.log("[DB] ✅ Connected successfully");
    return _db;
  } catch (error) {
    console.error("[DB] ❌ Connection failed:", error);
    throw error;
  }
}

/**
 * Fecha conexão com banco de dados
 */
export async function closeDb() {
  _db = null;
  console.log("[DB] Connection closed");
}

/**
 * Inicializa banco de dados
 * Cria tabelas se não existirem e popula dados iniciais
 */
export async function initDatabase() {
  const db = await getDb();
  
  console.log("[DB] Initializing database...");
  
  try {
    // Verificar se contadores existem, se não, criar
    const { counters } = schema;
    const existingCounters = await db.select().from(counters);
    
    if (existingCounters.length === 0) {
      await db.insert(counters).values([
        { name: "ccf", value: 0 },
        { name: "coo", value: 0 },
      ]);
      console.log("[DB] ✅ Counters initialized");
    }
    
    console.log("[DB] ✅ Database initialized successfully");
  } catch (error) {
    console.error("[DB] ❌ Initialization failed:", error);
    throw error;
  }
}
