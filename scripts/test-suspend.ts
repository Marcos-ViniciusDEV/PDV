import { suspendSale, getSuspendedSales, deleteSuspendedSale } from "../electron/services/sales.service";
import { getDb } from "../electron/db/config";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Testing suspend/recover sale...");

  const db = await getDb();
  // Ensure products exist
  await db.execute(sql`INSERT IGNORE INTO products (id, codigo, descricao, precoVenda, unidade, estoque, ativo) VALUES (1, '001', 'Product 1', 1000, 'UN', 100, 1)`);

  try {
    // 1. Suspend Sale
    console.log("Suspending sale...");
    const sale = await suspendSale({
      operatorId: 1,
      operatorName: "Test Operator",
      pdvId: "PDV001",
      items: [
        { productId: 1, quantity: 2, unitPrice: 1000 }, // 20.00
      ],
      payments: [], // Empty for suspended
      discount: 0
    });
    console.log("Sale suspended:", sale);

    // 2. Get Suspended Sales
    console.log("Fetching suspended sales...");
    const suspendedSales = await getSuspendedSales();
    console.log("Suspended sales count:", suspendedSales.length);
    const found = suspendedSales.find(s => s.uuid === sale.uuid);
    if (found) {
        console.log("✅ Found suspended sale:", found.uuid);
    } else {
        console.error("❌ Suspended sale not found!");
    }

    // 3. Delete Suspended Sale (Recover)
    if (found) {
        console.log("Deleting suspended sale (recover)...");
        await deleteSuspendedSale(found.uuid);
        
        const afterDelete = await getSuspendedSales();
        const foundAfter = afterDelete.find(s => s.uuid === sale.uuid);
        if (!foundAfter) {
            console.log("✅ Sale deleted successfully.");
        } else {
            console.error("❌ Sale still exists!");
        }
    }

  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

main();
