import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/config";
import {
  sales,
  saleItems,
  counters,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
} from "../db/schema";

/**
 * Repository para operações com vendas
 * Responsabilidade: Acesso a dados de vendas (Single Responsibility)
 */

/**
 * Cria uma nova venda com seus itens (transação)
 */
export async function createSale(
  saleData: InsertSale,
  items: Omit<InsertSaleItem, "saleId">[]
): Promise<Sale> {
  const db = await getDb();
  
  // Inserir venda
  const [result] = await db.insert(sales).values(saleData).$returningId();
  
  // Inserir itens
  if (items.length > 0) {
    const itemsWithSaleId = items.map((item) => ({
      ...item,
      saleId: result.id,
    }));
    
    await db.insert(saleItems).values(itemsWithSaleId);
  }
  
  // Buscar venda completa
  const [sale] = await db.select().from(sales).where(eq(sales.id, result.id));
  
  console.log(`[Sales Repository] Created sale ${sale.uuid}`);
  return sale;
}

/**
 * Busca vendas pendentes de sincronização
 */
export async function getPendingSales(): Promise<Sale[]> {
  const db = await getDb();
  return db.select().from(sales).where(eq(sales.syncStatus, "pending"));
}

/**
 * Busca itens de uma venda
 */
export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  const db = await getDb();
  return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
}

/**
 * Marca vendas como sincronizadas
 */
export async function markSalesAsSynced(uuids: string[]): Promise<void> {
  if (uuids.length === 0) return;
  
  const db = await getDb();
  
  for (const uuid of uuids) {
    await db
      .update(sales)
      .set({ syncStatus: "synced" })
      .where(eq(sales.uuid, uuid));
  }
  
  console.log(`[Sales Repository] Marked ${uuids.length} sales as synced`);
}

/**
 * Marca venda com erro de sincronização
 */
export async function markSaleAsError(
  uuid: string,
  error: string
): Promise<void> {
  const db = await getDb();
  
  await db
    .update(sales)
    .set({
      syncStatus: "error",
      syncError: error,
      syncAttempts: sql`${sales.syncAttempts} + 1`,
      lastSyncAttempt: new Date(),
    })
    .where(eq(sales.uuid, uuid));
  
  console.log(`[Sales Repository] Marked sale ${uuid} as error`);
}

/**
 * Obtém e incrementa contadores CCF e COO
 */
export async function getNextCounters(): Promise<{ ccf: number; coo: number }> {
  const db = await getDb();
  
  // Buscar contadores atuais
  const [ccfCounter] = await db
    .select()
    .from(counters)
    .where(eq(counters.name, "ccf"));
  
  const [cooCounter] = await db
    .select()
    .from(counters)
    .where(eq(counters.name, "coo"));
  
  const nextCcf = (ccfCounter?.value || 0) + 1;
  const nextCoo = (cooCounter?.value || 0) + 1;
  
  // Atualizar contadores
  await db
    .update(counters)
    .set({ value: nextCcf })
    .where(eq(counters.name, "ccf"));
  
  await db
    .update(counters)
    .set({ value: nextCoo })
    .where(eq(counters.name, "coo"));
  
  return { ccf: nextCcf, coo: nextCoo };
}

/**
 * Busca venda por UUID
 */
export async function getSaleByUuid(uuid: string): Promise<Sale | null> {
  const db = await getDb();
  const result = await db.select().from(sales).where(eq(sales.uuid, uuid)).limit(1);
  return result[0] || null;
}

/**
 * Busca vendas recentes (últimas 10)
 */
export async function getRecentSales(limit: number = 10): Promise<Sale[]> {
  const db = await getDb();
  return db
    .select()
    .from(sales)
    .orderBy(sql`${sales.createdAt} DESC`)
    .limit(limit);
}

