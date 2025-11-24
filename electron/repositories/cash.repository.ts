import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/config";
import {
  cashMovements,
  type CashMovement,
  type InsertCashMovement,
} from "../db/schema";

/**
 * Repository para operações com movimentações de caixa
 * Responsabilidade: Acesso a dados de caixa (Single Responsibility)
 */

/**
 * Cria uma nova movimentação de caixa
 */
export async function createMovement(
  movement: InsertCashMovement
): Promise<CashMovement> {
  const db = await getDb();
  
  const [result] = await db.insert(cashMovements).values(movement).$returningId();
  
  const [created] = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.id, result.id));
  
  console.log(`[Cash Repository] Created movement ${created.uuid} - ${created.type}`);
  return created;
}

/**
 * Busca movimentações pendentes de sincronização
 */
export async function getPendingMovements(): Promise<CashMovement[]> {
  const db = await getDb();
  return db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.syncStatus, "pending"));
}

/**
 * Marca movimentações como sincronizadas
 */
export async function markMovementsAsSynced(uuids: string[]): Promise<void> {
  if (uuids.length === 0) return;
  
  const db = await getDb();
  
  for (const uuid of uuids) {
    await db
      .update(cashMovements)
      .set({ syncStatus: "synced" })
      .where(eq(cashMovements.uuid, uuid));
  }
  
  console.log(`[Cash Repository] Marked ${uuids.length} movements as synced`);
}

/**
 * Marca movimentação com erro de sincronização
 */
export async function markMovementAsError(
  uuid: string,
  error: string
): Promise<void> {
  const db = await getDb();
  
  await db
    .update(cashMovements)
    .set({
      syncStatus: "error",
      syncError: error,
      syncAttempts: sql`${cashMovements.syncAttempts} + 1`,
      lastSyncAttempt: new Date(),
    })
    .where(eq(cashMovements.uuid, uuid));
  
  console.log(`[Cash Repository] Marked movement ${uuid} as error`);
}

/**
 * Calcula saldo do caixa
 */
export async function getCashBalance(): Promise<number> {
  const db = await getDb();
  
  const movements = await db.select().from(cashMovements);
  
  let balance = 0;
  
  for (const mov of movements) {
    if (mov.type === "ABERTURA" || mov.type === "REFORCO") {
      balance += mov.amount;
    } else if (mov.type === "SANGRIA" || mov.type === "FECHAMENTO") {
      balance -= mov.amount;
    }
  }
  
  return balance;
}

/**
 * Busca movimentação por UUID
 */
export async function getMovementByUuid(uuid: string): Promise<CashMovement | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.uuid, uuid))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca todas as movimentações
 */
export async function getAllMovements(): Promise<CashMovement[]> {
  const db = await getDb();
  return db.select().from(cashMovements);
}
