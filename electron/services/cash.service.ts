import { v4 as uuidv4 } from "uuid";
import * as cashRepository from "../repositories/cash.repository";
import { getDb } from "../db/config";
import { caixaSessions, cashMovements, sales as salesSchema, type InsertCashMovement, type InsertCaixaSession } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Service de caixa
 * Responsabilidade: Lógica de negócio de caixa (Single Responsibility)
 */

type MovementType = "ABERTURA" | "FECHAMENTO" | "SANGRIA" | "REFORCO";

/**
 * Abre uma nova sessão de caixa
 */
export async function openSession(operatorId: number, operatorName: string, initialAmount: number) {
  const db = await getDb();
  
  // Verificar se já existe sessão aberta para este operador
  const [existing] = await db.select().from(caixaSessions).where(
    and(
      eq(caixaSessions.operatorId, operatorId),
      eq(caixaSessions.status, "OPEN")
    )
  ).limit(1);

  if (existing) {
    throw new Error("Já existe um caixa aberto para este operador.");
  }

  const uuid = uuidv4();
  
  const newSession: InsertCaixaSession = {
    uuid,
    operatorId,
    operatorName,
    initialAmount,
    status: "OPEN",
    syncStatus: "pending"
  };

  const [result] = await db.insert(caixaSessions).values(newSession).$returningId();
  
  // Criar movimentação de abertura
  await createMovement({
    type: "ABERTURA",
    amount: initialAmount,
    operatorId,
    sessionId: result.id,
    reason: "Abertura de Caixa"
  });

  const [session] = await db.select().from(caixaSessions).where(eq(caixaSessions.id, result.id));
  return session;
}

/**
 * Fecha a sessão de caixa
 */
export async function closeSession(sessionId: number, finalAmount: number) {
  const db = await getDb();
  
  const [session] = await db.select().from(caixaSessions).where(
    eq(caixaSessions.id, sessionId)
  ).limit(1);

  if (!session || session.status !== "OPEN") {
    throw new Error("Sessão inválida ou já fechada.");
  }

  // Calcular totais
  const totals = await calculateSessionTotals(sessionId);

  // Atualizar sessão
  await db.update(caixaSessions)
    .set({
      closedAt: new Date(),
      finalAmount,
      status: "CLOSED",
      syncStatus: "pending"
    })
    .where(eq(caixaSessions.id, sessionId));

  // Criar movimentação de fechamento (diferença ou retirada)
  // Opcional: registrar a retirada do valor em gaveta como sangria de fechamento?
  // Por enquanto, apenas atualizamos o status.

  return { session: { ...session, closedAt: new Date(), finalAmount, status: "CLOSED" }, totals };
}

/**
 * Cria uma movimentação de caixa
 */
export async function createMovement(data: {
  type: MovementType;
  amount: number;
  operatorId: number;
  sessionId: number;
  reason?: string;
}) {
  console.log(`[Cash Service] Creating ${data.type} movement: ${data.amount}`);
  
  const uuid = uuidv4();
  
  const movement: InsertCashMovement = {
    uuid,
    type: data.type,
    amount: data.amount,
    operatorId: data.operatorId,
    sessionId: data.sessionId,
    reason: data.reason || null,
    syncStatus: "pending",
  };
  
  const created = await cashRepository.createMovement(movement);
  
  console.log(`[Cash Service] ✅ Movement created: ${created.uuid}`);
  
  return created;
}

/**
 * Busca sessão atual do operador
 */
export async function getCurrentSession(operatorId: number) {
  const db = await getDb();
  const [session] = await db.select().from(caixaSessions).where(
    and(
      eq(caixaSessions.operatorId, operatorId),
      eq(caixaSessions.status, "OPEN")
    )
  ).limit(1);
  return session;
}

/**
 * Calcula totais da sessão para Relatório Z
 */
export async function calculateSessionTotals(sessionId: number) {
  const db = await getDb();
  
  // Buscar movimentações
  const movements = await db.select().from(cashMovements).where(eq(cashMovements.sessionId, sessionId));
  
  // Buscar vendas
  const sessionSales = await db.select().from(salesSchema).where(eq(salesSchema.sessionId, sessionId));

  let salesTotal = 0;
  let bleedsTotal = 0;
  let suppliesTotal = 0;
  const paymentMethods: Record<string, number> = {};

  for (const sale of sessionSales) {
    if (sale.status === 'completed') {
      salesTotal += sale.total; // ou netTotal? Usar netTotal
      const method = sale.paymentMethod;
      paymentMethods[method] = (paymentMethods[method] || 0) + sale.netTotal;
    }
  }

  for (const mov of movements) {
    if (mov.type === 'SANGRIA') bleedsTotal += mov.amount;
    if (mov.type === 'REFORCO') suppliesTotal += mov.amount;
  }

  const [session] = await db.select().from(caixaSessions).where(eq(caixaSessions.id, sessionId)).limit(1);
  const initialAmount = session?.initialAmount || 0;

  const netTotal = initialAmount + salesTotal + suppliesTotal - bleedsTotal;

  return {
    salesTotal,
    salesCount: sessionSales.length,
    bleedsTotal,
    suppliesTotal,
    netTotal,
    paymentMethods
  };
}

/**
 * Busca saldo do caixa (Legacy - pode ser removido ou adaptado)
 */
export async function getCashBalance() {
  return cashRepository.getCashBalance();
}

/**
 * Busca movimentações pendentes de sincronização
 */
export async function getPendingMovements() {
  return cashRepository.getPendingMovements();
}

/**
 * Marca movimentações como sincronizadas
 */
export async function markMovementsAsSynced(uuids: string[]) {
  return cashRepository.markMovementsAsSynced(uuids);
}

/**
 * Busca todas as movimentações
 */
export async function getAllMovements() {
  return cashRepository.getAllMovements();
}
