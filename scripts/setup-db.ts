import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

/**
 * Script para configurar banco de dados do PDV
 * Cria banco, tabelas e dados iniciais
 */

async function setupDatabase() {
  console.log("=".repeat(60));
  console.log("PDV Database Setup");
  console.log("=".repeat(60));
  
  const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/pdv_local";
  
  // Parse URL
  const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    console.error("❌ Invalid DATABASE_URL format");
    console.error("Expected: mysql://user:password@host:port/database");
    process.exit(1);
  }
  
  const [, user, password, host, port, database] = urlMatch;
  
  console.log("\nConnection Info:");
  console.log(`  Host: ${host}:${port}`);
  console.log(`  User: ${user}`);
  console.log(`  Database: ${database}`);
  console.log();
  
  let connection: mysql.Connection | null = null;
  
  try {
    // Conectar sem especificar banco (para criar)
    console.log("Connecting to MySQL server...");
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
    });
    console.log("✅ Connected to MySQL server");
    
    // Criar banco de dados
    console.log(`\nCreating database '${database}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${database}' created/verified`);
    
    // Usar banco de dados
    await connection.query(`USE ${database}`);
    
    // Executar migration SQL
    console.log("\nExecuting migration...");
    const migrationPath = path.join(__dirname, "../drizzle/0001_initial.sql");
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    // Executar cada statement separadamente
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    console.log("✅ Migration executed successfully");
    
    // Verificar tabelas criadas
    console.log("\nVerifying tables...");
    const [tables] = await connection.query("SHOW TABLES");
    console.log(`✅ Found ${(tables as any[]).length} tables:`);
    (tables as any[]).forEach((row: any) => {
      const tableName = Object.values(row)[0];
      console.log(`   - ${tableName}`);
    });
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Database setup completed successfully!");
    console.log("=".repeat(60));
    console.log("\nYou can now run the PDV application:");
    console.log("  npm run dev");
    console.log();
    
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\nPlease check:");
    console.error("  1. MySQL server is running");
    console.error("  2. Credentials in .env are correct");
    console.error("  3. User has permission to create databases");
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup
setupDatabase();
