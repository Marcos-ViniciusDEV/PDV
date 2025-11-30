import { v4 as uuidv4 } from "uuid";
import * as cashRepository from "../repositories/cash.repository";
import { getDb } from "../db/config";
import { caixaSessions, cashMovements, sales as salesSchema, counters, type InsertCashMovement, type InsertCaixaSession } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

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

  const operatorStats: Record<string, {
    name: string;
    totalSales: number;
    totalDiscount: number;
    totalBleeds: number;
    totalSupplies: number;
    paymentMethods: Record<string, number>;
  }> = {};

  const getOrCreateOpStats = (name: string) => {
    if (!operatorStats[name]) {
      operatorStats[name] = {
        name,
        totalSales: 0,
        totalDiscount: 0,
        totalBleeds: 0,
        totalSupplies: 0,
        paymentMethods: {}
      };
    }
    return operatorStats[name];
  };

  const operatorNames = new Map<number, string>();

  for (const sale of sessionSales) {
    const opName = sale.operatorName || 'Desconhecido';
    if (sale.operatorId) {
      operatorNames.set(sale.operatorId, opName);
    }
    const stats = getOrCreateOpStats(opName);

    if (sale.status === 'completed') {
      salesTotal += sale.netTotal; // Usar netTotal
      const method = sale.paymentMethod;
      paymentMethods[method] = (paymentMethods[method] || 0) + sale.netTotal;

      // Operator breakdown
      stats.totalSales += sale.netTotal;
      stats.totalDiscount += sale.discount;
      stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + sale.netTotal;
    }
  }

  // Detailed movements
  const detailedMovements = movements.map(m => ({
    type: m.type,
    amount: m.amount,
    reason: m.reason || '',
    time: m.createdAt
  }));

  for (const mov of movements) {
    // Tentar identificar operador pelo ID se possível
    const opName = operatorNames.get(mov.operatorId) || `Operador ${mov.operatorId}`; 
    const stats = getOrCreateOpStats(opName);

    if (mov.type === 'SANGRIA') {
      bleedsTotal += mov.amount;
      stats.totalBleeds += mov.amount;
    }
    if (mov.type === 'REFORCO') {
      suppliesTotal += mov.amount;
      stats.totalSupplies += mov.amount;
    }
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
    paymentMethods,
    operatorSales: operatorStats,
    detailedMovements
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

/**
 * Calcula totais do dia para Relatório Z (Redução Z)
 */
export async function getDailyTotals(date: Date) {
  const db = await getDb();
  
  // Definir intervalo do dia (00:00:00 - 23:59:59)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Buscar movimentações do dia
  const movements = await db.select().from(cashMovements).where(
    and(
      // @ts-ignore
      gte(cashMovements.createdAt, startOfDay),
      // @ts-ignore
      lte(cashMovements.createdAt, endOfDay)
    )
  );
  
  // Buscar vendas do dia
  const dailySales = await db.select().from(salesSchema).where(
    and(
      // @ts-ignore
      gte(salesSchema.createdAt, startOfDay),
      // @ts-ignore
      lte(salesSchema.createdAt, endOfDay)
    )
  );

  let salesTotal = 0;
  let bleedsTotal = 0;
  let suppliesTotal = 0;
  const paymentMethods: Record<string, number> = {};
  const operatorStats: Record<string, {
    name: string;
    totalSales: number;
    totalDiscount: number;
    totalBleeds: number;
    totalSupplies: number;
    paymentMethods: Record<string, number>;
  }> = {};

  const getOrCreateOpStats = (name: string) => {
    if (!operatorStats[name]) {
      operatorStats[name] = {
        name,
        totalSales: 0,
        totalDiscount: 0,
        totalBleeds: 0,
        totalSupplies: 0,
        paymentMethods: {}
      };
    }
    return operatorStats[name];
  };

  const operatorNames = new Map<number, string>();

  for (const sale of dailySales) {
    const opName = sale.operatorName || 'Desconhecido';
    if (sale.operatorId) {
      operatorNames.set(sale.operatorId, opName);
    }
    const stats = getOrCreateOpStats(opName);

    if (sale.status === 'completed') {
      salesTotal += sale.netTotal;
      const method = sale.paymentMethod;
      paymentMethods[method] = (paymentMethods[method] || 0) + sale.netTotal;

      // Operator breakdown
      stats.totalSales += sale.netTotal;
      stats.totalDiscount += sale.discount;
      stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + sale.netTotal;
    }
  }

  // Detailed movements
  const detailedMovements = movements.map(m => ({
    type: m.type,
    amount: m.amount,
    reason: m.reason || '',
    time: m.createdAt
  }));

  for (const mov of movements) {
    // Tentar identificar operador pelo ID se possível
    // Se tivermos mapeado o nome nas vendas, usamos. Senão, fallback para ID.
    const opName = operatorNames.get(mov.operatorId) || `Operador ${mov.operatorId}`; 
    const stats = getOrCreateOpStats(opName);

    if (mov.type === 'SANGRIA') {
      bleedsTotal += mov.amount;
      stats.totalBleeds += mov.amount;
    }
    if (mov.type === 'REFORCO') {
      suppliesTotal += mov.amount;
      stats.totalSupplies += mov.amount;
    }
  }

  // Calcular total líquido (Vendas + Suprimentos - Sangrias)
  const netTotal = salesTotal + suppliesTotal - bleedsTotal;

  // --- DADOS FISCAIS ---

  // 1. Contadores (CRZ, CRO, GT)
  // Nota: Em um sistema real, isso seria mais complexo. Aqui estamos simulando/persistindo em tabela simples.
  
  // CRZ - Contador de Redução Z (Incrementa a cada Z emitido)
  let crz = 0;
  const crzCounter = await db.select().from(counters).where(eq(counters.name, 'CRZ')).limit(1);
  if (crzCounter.length > 0) {
    crz = crzCounter[0].value + 1;
    await db.update(counters).set({ value: crz }).where(eq(counters.name, 'CRZ'));
  } else {
    crz = 1;
    await db.insert(counters).values({ name: 'CRZ', value: crz });
  }

  // CRO - Contador de Reinício de Operação (Mockado por enquanto, ou fixo)
  let cro = 1;
  const croCounter = await db.select().from(counters).where(eq(counters.name, 'CRO')).limit(1);
  if (croCounter.length > 0) {
    cro = croCounter[0].value;
  } else {
    await db.insert(counters).values({ name: 'CRO', value: cro });
  }

  // Calcular Venda Bruta do Dia (Net + Descontos)
  let grossTotal = 0;
  let discountTotal = 0;
  let cancelledCount = 0;
  let cancelledTotal = 0;

  // Buscar TODAS as vendas do dia (incluindo canceladas para contagem)
  const allDailySales = await db.select().from(salesSchema).where(
    and(
      // @ts-ignore
      gte(salesSchema.createdAt, startOfDay),
      // @ts-ignore
      lte(salesSchema.createdAt, endOfDay)
    )
  );

  let cooInitial = 999999;
  let cooFinal = 0;

  for (const sale of allDailySales) {
    const coo = parseInt(sale.coo || '0');
    if (coo > 0) {
      if (coo < cooInitial) cooInitial = coo;
      if (coo > cooFinal) cooFinal = coo;
    }

    if (sale.status === 'completed') {
      grossTotal += sale.total; // Total bruto (sem desconto)
      discountTotal += sale.discount;
    } else if (sale.status === 'cancelled') {
      cancelledCount++;
      cancelledTotal += sale.total;
    }
  }

  if (cooInitial === 999999) cooInitial = 0;

  // GT - Grande Total (Acumulado de todas as vendas da história)
  // Calcular dinamicamente somando todas as vendas concluídas
  const allHistorySales = await db.select({ 
    total: salesSchema.total 
  }).from(salesSchema).where(eq(salesSchema.status, 'completed'));
  
  const gt = allHistorySales.reduce((acc, sale) => acc + sale.total, 0);

  // Calcular Venda Semanal
  const weeklyTotal = await getWeeklyTotal(db, startOfDay);

  // Calcular Venda Mensal (Janeiro a Dezembro)
  const monthlyTotals = await getMonthlyTotals(db, startOfDay);

  // Não atualizamos mais o contador GT na tabela de forma incremental aqui para evitar duplicação.
  // O GT é sempre a soma de tudo.

  return {
    salesTotal,
    salesCount: dailySales.length,
    bleedsTotal,
    suppliesTotal,
    netTotal,
    paymentMethods,
    operatorSales: operatorStats, // Mantendo o nome da chave para compatibilidade ou mudando se necessário. Vamos mudar o tipo no retorno.
    detailedMovements,
    date: startOfDay,
    // Fiscal Data
    fiscal: {
      crz,
      cro,
      gt,
      cooInitial,
      cooFinal,
      grossTotal,
      discountTotal,
      cancelledCount,
      cancelledTotal,
      weeklyTotal,
      monthlyTotals
    }
  };
}

async function getWeeklyTotal(db: any, date: Date) {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(date);
  endOfWeek.setDate(date.getDate() + (6 - date.getDay())); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklySales = await db.select({ total: salesSchema.total }).from(salesSchema).where(
    and(
      // @ts-ignore
      gte(salesSchema.createdAt, startOfWeek),
      // @ts-ignore
      lte(salesSchema.createdAt, endOfWeek),
      eq(salesSchema.status, 'completed')
    )
  );

  return weeklySales.reduce((acc: number, sale: { total: number }) => acc + sale.total, 0);
}

async function getMonthlyTotals(db: any, date: Date) {
  const year = date.getFullYear();
  const monthlyTotals: Record<string, number> = {};
  
  // Initialize all months with 0
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  months.forEach(m => monthlyTotals[m] = 0);

  const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

  const yearSales = await db.select({ 
    total: salesSchema.total,
    createdAt: salesSchema.createdAt 
  }).from(salesSchema).where(
    and(
      // @ts-ignore
      gte(salesSchema.createdAt, startOfYear),
      // @ts-ignore
      lte(salesSchema.createdAt, endOfYear),
      eq(salesSchema.status, 'completed')
    )
  );

  for (const sale of yearSales) {
    const saleDate = new Date(sale.createdAt);
    const monthIndex = saleDate.getMonth();
    const monthName = months[monthIndex];
    monthlyTotals[monthName] += sale.total;
  }

  return monthlyTotals;
}
