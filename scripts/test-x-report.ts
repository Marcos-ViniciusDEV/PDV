import { openSession, closeSession, createMovement, calculateSessionTotals } from "../electron/services/cash.service";
import { createSale } from "../electron/services/sales.service";
import { getDb } from "../electron/db/config";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Testing X Report (Session Totals)...");

  const db = await getDb();
  
  // Clear tables to avoid duplicates
  await db.execute(sql`DELETE FROM sale_items`);
  await db.execute(sql`DELETE FROM sale_payments`);
  await db.execute(sql`DELETE FROM sales`);
  await db.execute(sql`DELETE FROM cash_movements`);
  await db.execute(sql`DELETE FROM caixa_sessions`);
  await db.execute(sql`UPDATE counters SET value = 0 WHERE name IN ('ccf', 'coo')`);

  // Ensure products exist
  await db.execute(sql`INSERT IGNORE INTO products (id, codigo, descricao, precoVenda, unidade, estoque, ativo) VALUES (1, '001', 'Product 1', 1000, 'UN', 100, 1)`);

  try {
    // 1. Open Session
    console.log("Opening session...");
    // Use a unique operator ID to avoid conflicts or just use 99
    const operatorId = 99;
    
    // Close any existing session for this operator
    await db.execute(sql`UPDATE caixa_sessions SET status = 'CLOSED', closedAt = NOW() WHERE operatorId = ${operatorId} AND status = 'OPEN'`);

    const session = await openSession(operatorId, "Test Operator X", 10000); // 100.00 initial
    console.log("Session opened:", session.id);

    // 2. Create Sales
    console.log("Creating sales...");
    const pdvId = `TEST-${Date.now()}`;
    
    await createSale({
      operatorId,
      operatorName: "Test Operator X",
      pdvId,
      items: [{ productId: 1, quantity: 1, unitPrice: 1000, discount: 0 }],
      payments: [{ method: "DINHEIRO", amount: 1000 }],
      discount: 0
    }); // +10.00 Cash

    await createSale({
      operatorId,
      operatorName: "Test Operator X",
      pdvId,
      items: [{ productId: 1, quantity: 2, unitPrice: 1000, discount: 0 }],
      payments: [{ method: "DEBITO", amount: 2000 }],
      discount: 0
    }); // +20.00 Debit

    // 3. Create Movements
    console.log("Creating movements...");
    await createMovement({
      type: "SANGRIA",
      amount: 500, // -5.00
      operatorId,
      sessionId: session.id,
      reason: "Test Bleed"
    });

    await createMovement({
      type: "REFORCO",
      amount: 2000, // +20.00
      operatorId,
      sessionId: session.id,
      reason: "Test Supply"
    });

    // 4. Calculate Totals (X Report)
    console.log("Calculating totals...");
    const totals = await calculateSessionTotals(session.id);
    
    console.log("--- X REPORT ---");
    console.log("Sales Total:", totals.salesTotal); // Should be 3000
    console.log("Bleeds Total:", totals.bleedsTotal); // Should be 500
    console.log("Supplies Total:", totals.suppliesTotal); // Should be 2000
    console.log("Net Total:", totals.netTotal); // 10000 (Initial) + 3000 (Sales) + 2000 (Supply) - 500 (Bleed) = 14500
    console.log("Payment Methods:", totals.paymentMethods);

    if (totals.salesTotal === 3000 && totals.netTotal === 14500) {
        console.log("✅ Totals are correct!");
    } else {
        console.error("❌ Totals are incorrect!");
    }

    // Cleanup
    await closeSession(session.id, totals.netTotal);

  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

main();
