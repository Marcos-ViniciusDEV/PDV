
const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const { sales } = require('./electron/db/schema');
const { eq } = require('drizzle-orm');

const sqlite = new Database('pdv-database.sqlite');
const db = drizzle(sqlite);

const allSales = sqlite.prepare("SELECT id, total, discount, netTotal FROM sales WHERE status = 'completed'").all();

console.log("ID | Total | Discount | NetTotal | Diff (Total - Discount - NetTotal)");
console.log("---|-------|----------|----------|-----------------------------------");

let sumTotal = 0;
let sumNet = 0;

allSales.forEach(sale => {
  const diff = sale.total - sale.discount - sale.netTotal;
  sumTotal += sale.total;
  sumNet += sale.netTotal;
  
  if (diff !== 0 || sale.netTotal > sale.total) {
    console.log(`${sale.id} | ${sale.total} | ${sale.discount} | ${sale.netTotal} | ${diff} ${sale.netTotal > sale.total ? '!!! NET > TOTAL !!!' : ''}`);
  }
});

console.log("----------------------------------------------------------------");
console.log(`Sum Total (GT): ${sumTotal}`);
console.log(`Sum Net Total: ${sumNet}`);
