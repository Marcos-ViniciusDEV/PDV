import * as apiClient from "../http/api-client";
import * as catalogService from "./catalog.service";
import * as salesService from "./sales.service";
import * as cashService from "./cash.service";
import dotenv from "dotenv";

dotenv.config();

/**
 * Service de sincronização
 * Responsabilidade: Sincronização com API Central (Single Responsibility)
 * Depende de: api-client, catalog.service, sales.service, cash.service (Dependency Inversion)
 */

let isOnline = false;
let syncInterval: NodeJS.Timeout | null = null;
let checkInterval: NodeJS.Timeout | null = null;

const PDV_ID = process.env.VITE_PDV_ID || "PDV001";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const CHECK_INTERVAL_MS = 30 * 1000; // 30 segundos

/**
 * Inicia serviço de sincronização
 */
export async function startSyncService() {
  console.log("[Sync Service] Starting...");
  console.log("[Sync Service] PDV ID:", PDV_ID);
  
  // Carregar catálogo inicial
  await loadCatalog();
  
  // Verificar conexão periodicamente
  checkInterval = setInterval(checkConnection, CHECK_INTERVAL_MS);
  
  // Sincronizar periodicamente
  syncInterval = setInterval(syncPendingData, SYNC_INTERVAL_MS);
  
  // Verificar conexão imediatamente
  await checkConnection();
  
  console.log("[Sync Service] ✅ Started");
}

/**
 * Para serviço de sincronização
 */
export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  
  console.log("[Sync Service] Stopped");
}

/**
 * Carrega catálogo da API Central
 */
export async function loadCatalog() {
  try {
    console.log("[Sync Service] Loading catalog...");
    
    const data = await apiClient.fetchCatalog();
    await catalogService.loadCatalog(data);
    
    console.log("[Sync Service] ✅ Catalog loaded");
    return true;
  } catch (error: any) {
    console.error("[Sync Service] ❌ Failed to load catalog:", error.message);
    return false;
  }
}

/**
 * Verifica conexão com API
 */
export async function checkConnection() {
  const online = await apiClient.checkHealth();
  
  if (online !== isOnline) {
    isOnline = online;
    console.log(`[Sync Service] Status changed: ${isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`);
  }
  
  return isOnline;
}

/**
 * Sincroniza dados pendentes
 */
export async function syncPendingData() {
  console.log("[Sync Service] Sync triggered. Online:", isOnline);
  
  // Verificar conexão antes de sincronizar
  await checkConnection();
  
  if (!isOnline) {
    console.log("[Sync Service] Skipping sync - offline");
    return { success: false, reason: "offline" };
  }
  
  try {
    // Buscar dados pendentes
    const pendingSales = await salesService.getPendingSales();
    const pendingMovements = await cashService.getPendingMovements();
    
    console.log(`[Sync Service] Found ${pendingSales.length} sales, ${pendingMovements.length} movements`);
    
    if (pendingSales.length === 0 && pendingMovements.length === 0) {
      console.log("[Sync Service] Nothing to sync");
      return { success: true, synced: 0 };
    }
    
    // Preparar dados para sincronização
    const vendas = await Promise.all(
      pendingSales.map(async (sale) => {
        const items = await salesService.getSaleItems(sale.id);
        
        return {
          uuid: sale.uuid,
          numeroVenda: sale.numeroVenda,
          ccf: sale.ccf,
          coo: sale.coo,
          pdvId: sale.pdvId,
          dataVenda: sale.createdAt,
          valorTotal: sale.total,
          valorDesconto: sale.discount,
          valorLiquido: sale.netTotal,
          formaPagamento: sale.paymentMethod,
          operadorId: sale.operatorId,
          operadorNome: sale.operatorName,
          itens: items.map((item) => ({
            produtoId: item.productId,
            quantidade: item.quantity,
            precoUnitario: item.unitPrice,
            valorTotal: item.total,
            valorDesconto: item.discount,
          })),
        };
      })
    );
    
    // Filtrar apenas movimentos aceitos pelo backend (VENDA é apenas para controle local)
    const movimentosCaixa = pendingMovements
      .filter((mov) => mov.type !== "VENDA")
      .map((mov) => ({
        uuid: mov.uuid,
        tipo: mov.type,
        valor: mov.amount,
        observacao: mov.reason || "Sincronização automática",
        operadorId: mov.operatorId,
        dataMovimento: mov.createdAt,
      }));
    
    // Enviar para API
    const result = await apiClient.syncBatch({ vendas, movimentosCaixa });
    
    // Marcar como sincronizado
    if (vendas.length > 0) {
      const uuids = vendas.map((v) => v.uuid);
      await salesService.markSalesAsSynced(uuids);
    }
    
    
    // Marcar todos os movimentos pendentes como sincronizados (VENDA é local-only)
    if (pendingMovements.length > 0) {
      const uuids = pendingMovements.map((m) => m.uuid);
      await cashService.markMovementsAsSynced(uuids);
    }
    
    console.log(`[Sync Service] ✅ Synced ${vendas.length} sales, ${movimentosCaixa.length} movements`);
    
    return {
      success: true,
      synced: vendas.length + movimentosCaixa.length,
      result,
    };
  } catch (error: any) {
    console.error("[Sync Service] ❌ Sync failed:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Força sincronização imediata
 */
export async function forceSyncNow() {
  console.log("[Sync Service] Force sync requested");
  return syncPendingData();
}

/**
 * Retorna status do serviço
 */
export function getStatus() {
  return {
    isOnline,
    pdvId: PDV_ID,
    lastCheck: new Date().toISOString(),
  };
}
