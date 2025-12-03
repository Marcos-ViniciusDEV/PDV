import { v4 as uuidv4 } from "uuid";
import * as salesRepository from "../repositories/sales.repository";
import * as cashService from "./cash.service";
import type { InsertSale, InsertSaleItem, InsertSalePayment } from "../db/schema";

/**
 * Service de vendas
 * Responsabilidade: Lógica de negócio de vendas (Single Responsibility)
 * Depende de: sales.repository (Dependency Inversion)
 */

interface CreateSaleInput {
  operatorId: number;
  operatorName: string;
  pdvId: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  discount?: number;
}

/**
 * Cria uma nova venda
 * Gera CCF, COO e UUID automaticamente
 */
export async function createSale(input: CreateSaleInput) {
  console.log("[Sales Service] Creating sale...");
  
  // Verificar sessão aberta
  const session = await cashService.getCurrentSession(input.operatorId);
  if (!session) {
    throw new Error("Não há caixa aberto para este operador.");
  }

  // Gerar UUID
  const uuid = uuidv4();
  
  // Obter próximos contadores
  const { ccf, coo } = await salesRepository.getNextCounters();
  
  // Calcular totais
  const itemsTotal = input.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount || 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);
  
  const discount = input.discount || 0;
  const netTotal = itemsTotal - discount;
  
  // Gerar número da venda (formato: PDV001-000001)
  const numeroVenda = `${input.pdvId}-${coo.toString().padStart(6, "0")}`;
  
  // Preparar dados da venda
  const saleData: InsertSale = {
    uuid,
    numeroVenda,
    ccf: ccf.toString().padStart(6, "0"),
    coo: coo.toString().padStart(6, "0"),
    pdvId: input.pdvId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    sessionId: session.id, // Link para a sessão
    total: itemsTotal,
    discount,
    netTotal,
    paymentMethod: input.payments[0]?.method || "MISTO", // Primary method or MISTO
    couponType: "NFC-e",
    syncStatus: "pending",
  };
  
  // Preparar itens
  const items: Omit<InsertSaleItem, "saleId">[] = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
    discount: item.discount || 0,
  }));

  // Preparar pagamentos
  const payments: Omit<InsertSalePayment, "saleId">[] = input.payments.map((p) => ({
    method: p.method,
    amount: p.amount,
  }));
  
  // Criar venda
  const sale = await salesRepository.createSale(saleData, items, payments);
  
  console.log(`[Sales Service] ✅ Sale created: ${sale.numeroVenda} (${sale.uuid})`);
  
  return {
    uuid: sale.uuid,
    numeroVenda: sale.numeroVenda,
    ccf: sale.ccf,
    coo: sale.coo,
    total: sale.total,
    netTotal: sale.netTotal,
  };
}

/**
 * Busca vendas pendentes de sincronização
 */
export async function getPendingSales() {
  return salesRepository.getPendingSales();
}

/**
 * Busca itens de uma venda
 */
export async function getSaleItems(saleId: number) {
  return salesRepository.getSaleItems(saleId);
}

/**
 * Marca vendas como sincronizadas
 */
export async function markSalesAsSynced(uuids: string[]) {
  return salesRepository.markSalesAsSynced(uuids);
}

/**
 * Busca vendas recentes com seus itens
 */
export async function getRecentSales(limit: number = 10) {
  const sales = await salesRepository.getRecentSales(limit);
  
  // Buscar itens de cada venda
  const salesWithItems = await Promise.all(
    sales.map(async (sale) => {
      const items = await salesRepository.getSaleItems(sale.id);
      return {
        ...sale,
        items,
      };
    })
  );
  
  return salesWithItems;
}

/**
 * Cancela uma venda (cupom)
 * Cria o registro da venda com status 'cancelled'
 */
export async function cancelSale(input: CreateSaleInput) {
  console.log("[Sales Service] Cancelling sale...");
  
  // Gerar UUID
  const uuid = uuidv4();
  
  // Obter próximos contadores
  const { ccf, coo } = await salesRepository.getNextCounters();
  
  // Calcular totais
  const itemsTotal = input.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount || 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);
  
  const discount = input.discount || 0;
  const netTotal = itemsTotal - discount;
  
  // Gerar número da venda (formato: PDV001-000001)
  const numeroVenda = `${input.pdvId}-${coo.toString().padStart(6, "0")}`;
  
  // Preparar dados da venda
  const saleData: InsertSale = {
    uuid,
    numeroVenda,
    ccf: ccf.toString().padStart(6, "0"),
    coo: coo.toString().padStart(6, "0"),
    pdvId: input.pdvId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    total: itemsTotal,
    discount,
    netTotal,
    paymentMethod: "CANCELADO", // Método de pagamento fixo para cancelamentos
    couponType: "NFC-e",
    syncStatus: "pending",
    status: "cancelled", // Status cancelado
  };
  
  // Preparar itens
  const items: Omit<InsertSaleItem, "saleId">[] = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
    discount: item.discount || 0,
  }));
  
  // Criar venda
  const sale = await salesRepository.createSale(saleData, items);
  
  console.log(`[Sales Service] 🚫 Sale cancelled: ${sale.numeroVenda} (${sale.uuid})`);
  
  return {
    uuid: sale.uuid,
    numeroVenda: sale.numeroVenda,
    ccf: sale.ccf,
    coo: sale.coo,
    status: sale.status,
  };
}

