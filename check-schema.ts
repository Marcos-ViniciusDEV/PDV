import { getDb } from './electron/db/config';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  try {
    console.log('Connecting to database...');
    const db = await getDb();
    
    console.log('--- SALES TABLE COLUMNS ---');
    // Drizzle execute returns [rows, metadata]
    const [columns] = await db.execute(sql`DESCRIBE sales`);
    (columns as any[]).forEach(c => console.log(c.Field));

    process.exit(0);
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}

checkSchema();
