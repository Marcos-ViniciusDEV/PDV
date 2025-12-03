import { createSale } from "../electron/services/sales.service";
import { getDb } from "../electron/db/config";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Testing mixed payment...");

  // Mock session (ensure one exists)
  const db = await getDb();
  await db.execute(sql`INSERT IGNORE INTO caixa_sessions (id, operatorId, openedAt, initialAmount, status) VALUES (999, 1, NOW(), 10000, 'OPEN')`);
  await db.execute(sql`INSERT IGNORE INTO products (id, codigo, descricao, precoVenda, unidade, estoque, ativo) VALUES (1, '001', 'Product 1', 1000, 'UN', 100, 1)`);
  await db.execute(sql`INSERT IGNORE INTO products (id, codigo, descricao, precoVenda, unidade, estoque, ativo) VALUES (2, '002', 'Product 2', 5000, 'UN', 100, 1)`);

  try {
    const sale = await createSale({
      operatorId: 1,
      operatorName: "Test Operator",
      pdvId: "PDV001",
      items: [
        { productId: 1, quantity: 2, unitPrice: 1000 }, // 20.00
        { productId: 2, quantity: 1, unitPrice: 5000 }, // 50.00
      ],
      // Total: 70.00
      payments: [
        { method: "DINHEIRO", amount: 2000 }, // 20.00
        { method: "DEBITO", amount: 5000 },   // 50.00
      ],
      discount: 0
    });

    console.log("Sale created:", sale);
    
    // Verify payments in DB
    const payments = await db.execute(sql`SELECT * FROM sale_payments WHERE saleId = (SELECT id FROM sales WHERE uuid = ${sale.uuid})`);
    console.log("Payments stored:", payments[0]);

  } catch (error) {
    console.error("Error creating sale:", error);
  }
  
  process.exit(0);
}

main();
