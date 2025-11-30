
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./electron/db/schema";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/pdv_local";
  console.log(`Connecting to ${DATABASE_URL}...`);
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  const allSales = await db.select().from(schema.sales);

  console.log("ID | Total | Discount | NetTotal | Diff (Total - Discount - NetTotal)");
  console.log("---|-------|----------|----------|-----------------------------------");

  let sumTotal = 0;
  let sumNet = 0;

  for (const sale of allSales) {
    if (sale.status === 'completed') {
      const diff = sale.total - sale.discount - sale.netTotal;
      sumTotal += sale.total;
      sumNet += sale.netTotal;
      
      if (diff !== 0 || sale.netTotal > sale.total) {
        console.log(`${sale.id} | ${sale.total} | ${sale.discount} | ${sale.netTotal} | ${diff} ${sale.netTotal > sale.total ? '!!! NET > TOTAL !!!' : ''}`);
      }
    }
  }

  console.log("----------------------------------------------------------------");
  console.log(`Sum Total (GT): ${sumTotal}`);
  console.log(`Sum Net Total: ${sumNet}`);
  
  await connection.end();
}

main().catch(console.error);
