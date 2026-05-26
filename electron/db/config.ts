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
    await ensureFiscalColumns();

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

async function ensureFiscalColumns() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/pdv_local";
  const connection = await mysql.createConnection(databaseUrl);
  const dbName = new URL(databaseUrl).pathname.replace(/^\//, "");

  async function columnExists(table: string, column: string) {
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [dbName, table, column]
    );
    return (rows as any[])[0].count > 0;
  }

  async function addColumn(table: string, column: string, ddl: string) {
    if (!(await columnExists(table, column))) {
      await connection.execute(`ALTER TABLE \`${table}\` ADD ${ddl}`);
      console.log(`[DB] Added fiscal column ${table}.${column}`);
    }
  }

  await addColumn("configuracoes", "habilitarNfce", "`habilitarNfce` boolean NOT NULL DEFAULT false");
  await addColumn("configuracoes", "ambienteFiscal", "`ambienteFiscal` varchar(20) NOT NULL DEFAULT 'HOMOLOGACAO'");
  await addColumn("configuracoes", "regimeTributario", "`regimeTributario` varchar(30) NOT NULL DEFAULT 'SIMPLES_NACIONAL'");
  await addColumn("configuracoes", "serieNfce", "`serieNfce` int NOT NULL DEFAULT 1");
  await addColumn("configuracoes", "serieNfe", "`serieNfe` int NOT NULL DEFAULT 1");
  await addColumn("configuracoes", "proximoNumeroNfce", "`proximoNumeroNfce` int NOT NULL DEFAULT 1");
  await addColumn("configuracoes", "proximoNumeroNfe", "`proximoNumeroNfe` int NOT NULL DEFAULT 1");
  await addColumn("configuracoes", "idTokenIsc", "`idTokenIsc` varchar(10)");
  await addColumn("configuracoes", "cscConfigurado", "`cscConfigurado` boolean NOT NULL DEFAULT false");
  await addColumn("configuracoes", "certificadoConfigurado", "`certificadoConfigurado` boolean NOT NULL DEFAULT false");
  await addColumn("configuracoes", "certificadoValidade", "`certificadoValidade` timestamp NULL");
  await addColumn("configuracoes", "fiscalAtualizadoEm", "`fiscalAtualizadoEm` timestamp NULL");

  await addColumn("products", "ncm", "`ncm` varchar(8)");
  await addColumn("products", "cest", "`cest` varchar(7)");
  await addColumn("products", "origem", "`origem` int DEFAULT 0");
  await addColumn("products", "cstIcms", "`cstIcms` varchar(4)");
  await addColumn("products", "csosnIcms", "`csosnIcms` varchar(4)");
  await addColumn("products", "cfopPadraoVenda", "`cfopPadraoVenda` varchar(4)");
  await addColumn("products", "aliquotaIcms", "`aliquotaIcms` int DEFAULT 0");
  await addColumn("products", "aliquotaPis", "`aliquotaPis` int DEFAULT 0");
  await addColumn("products", "aliquotaCofins", "`aliquotaCofins` int DEFAULT 0");
  await addColumn("products", "pisCst", "`pisCst` varchar(2)");
  await addColumn("products", "cofinsCst", "`cofinsCst` varchar(2)");

  await connection.end();
}
