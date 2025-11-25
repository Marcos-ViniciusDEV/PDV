import { ipcMain } from "electron";
import * as authService from "../services/auth.service";
import * as catalogService from "../services/catalog.service";
import * as salesService from "../services/sales.service";
import * as cashService from "../services/cash.service";
import * as syncService from "../services/sync.service";

/**
 * Controllers para IPC do Electron
 * Responsabilidade: Gerenciar comunicação IPC (Single Responsibility)
 * Depende de: services (Dependency Inversion)
 */

/**
 * Registra todos os handlers IPC
 */
export function registerIpcHandlers() {
  console.log("[Controllers] Registering IPC handlers...");
  
  // ========== AUTH ==========
  ipcMain.handle("validate-user", async (_, email: string, password: string) => {
    try {
      return await authService.validateUser(email, password);
    } catch (error: any) {
      console.error("[Controller] validate-user error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("validate-user-by-id-or-email", async (_, identifier: string, password: string) => {
    try {
      return await authService.validateUserByIdOrEmail(identifier, password);
    } catch (error: any) {
      console.error("[Controller] validate-user-by-id-or-email error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-users", async () => {
    try {
      return await authService.getAllUsers();
    } catch (error: any) {
      console.error("[Controller] get-users error:", error);
      throw error;
    }
  });
  
  // ========== PRODUCTS ==========
  ipcMain.handle("get-products", async () => {
    try {
      return await catalogService.getAllProducts();
    } catch (error: any) {
      console.error("[Controller] get-products error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-product-by-barcode", async (_, barcode: string) => {
    try {
      return await catalogService.getProductByBarcode(barcode);
    } catch (error: any) {
      console.error("[Controller] get-product-by-barcode error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-product-by-code", async (_, codigo: string) => {
    try {
      return await catalogService.getProductByCode(codigo);
    } catch (error: any) {
      console.error("[Controller] get-product-by-code error:", error);
      throw error;
    }
  });

  ipcMain.handle("save-catalog", async (event, data: any) => {
    try {
      const result = await catalogService.loadCatalog(data);
      // Notify renderer that catalog has been updated
      event.sender.send('catalog:updated');
      return result;
    } catch (error: any) {
      console.error("[Controller] save-catalog error:", error);
      throw error;
    }
  });
  
  // ========== SALES ==========
  ipcMain.handle("save-order", async (_, orderData: any) => {
    try {
      return await salesService.createSale({
        operatorId: orderData.operatorId,
        operatorName: orderData.operatorName,
        pdvId: orderData.pdvId,
        items: orderData.items,
        paymentMethod: orderData.paymentMethod,
        discount: orderData.discount,
      });
    } catch (error: any) {
      console.error("[Controller] save-order error:", error);
      throw error;
    }
  });

  ipcMain.handle("cancel-sale", async (_, saleData: any) => {
    try {
      return await salesService.cancelSale({
        operatorId: saleData.operatorId,
        operatorName: saleData.operatorName,
        pdvId: saleData.pdvId,
        items: saleData.items,
        paymentMethod: "CANCELADO",
        discount: saleData.discount,
      });
    } catch (error: any) {
      console.error("[Controller] cancel-sale error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-pending-orders", async () => {
    try {
      return await salesService.getPendingSales();
    } catch (error: any) {
      console.error("[Controller] get-pending-orders error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-recent-sales", async (_, limit: number = 10) => {
    try {
      return await salesService.getRecentSales(limit);
    } catch (error: any) {
      console.error("[Controller] get-recent-sales error:", error);
      throw error;
    }
  });
  
  
  // ========== CASH ==========
  ipcMain.handle("save-cash-movement", async (_, movement: any) => {
    try {
      return await cashService.createMovement(
        movement.type,
        movement.amount,
        movement.operatorId,
        movement.reason
      );
    } catch (error: any) {
      console.error("[Controller] save-cash-movement error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-cash-balance", async () => {
    try {
      return await cashService.getCashBalance();
    } catch (error: any) {
      console.error("[Controller] get-cash-balance error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-pending-movements", async () => {
    try {
      return await cashService.getPendingMovements();
    } catch (error: any) {
      console.error("[Controller] get-pending-movements error:", error);
      throw error;
    }
  });
  
  // ========== SYNC ==========
  ipcMain.handle("load-catalog", async () => {
    try {
      return await syncService.loadCatalog();
    } catch (error: any) {
      console.error("[Controller] load-catalog error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("sync-now", async () => {
    try {
      return await syncService.forceSyncNow();
    } catch (error: any) {
      console.error("[Controller] sync-now error:", error);
      throw error;
    }
  });
  
  ipcMain.handle("get-sync-status", async () => {
    try {
      return syncService.getStatus();
    } catch (error: any) {
      console.error("[Controller] get-sync-status error:", error);
      throw error;
    }
  });
  
  console.log("[Controllers] ✅ IPC handlers registered");
}
