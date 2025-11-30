import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  auth: {
    validateSupervisor: (password: string) => ipcRenderer.invoke('validate-supervisor', password),
  },
  db: {
    // Products
    getProducts: () => ipcRenderer.invoke('get-products'),
    getProductByBarcode: (barcode: string) => ipcRenderer.invoke('get-product-by-barcode', barcode),
    getProductByCode: (codigo: string) => ipcRenderer.invoke('get-product-by-code', codigo),
    
    // Users
    getUsers: () => ipcRenderer.invoke('get-users'),
    validateUser: (email: string, password: string) => ipcRenderer.invoke('validate-user', email, password),
    validateUserByIdOrEmail: (identifier: string, password: string) => ipcRenderer.invoke('validate-user-by-id-or-email', identifier, password),
    
    saveCatalog: (data: any) => ipcRenderer.invoke('save-catalog', data),

    // Sales
    saveOrder: (order: any) => ipcRenderer.invoke('save-order', order),
    cancelSale: (saleData: any) => ipcRenderer.invoke('cancel-sale', saleData),
    getPendingOrders: () => ipcRenderer.invoke('get-pending-orders'),
    getRecentSales: (limit?: number) => ipcRenderer.invoke('get-recent-sales', limit),
    
    // Cash
    saveCashMovement: (movement: any) => ipcRenderer.invoke('save-cash-movement', movement),
    getCashBalance: () => ipcRenderer.invoke('get-cash-balance'),
    getPendingMovements: () => ipcRenderer.invoke('get-pending-movements'),
    
    // Caixa (New)
    abrirCaixa: (data: any) => ipcRenderer.invoke('caixa:abrir', data),
    fecharCaixa: (data: any) => ipcRenderer.invoke('caixa:fechar', data),
    sangria: (data: any) => ipcRenderer.invoke('caixa:sangria', data),
    suprimento: (data: any) => ipcRenderer.invoke('caixa:suprimento', data),
    getCaixaStatus: (operatorId: number) => ipcRenderer.invoke('caixa:status', { operatorId }),
    getCaixaTotals: (sessionId: number) => ipcRenderer.invoke('caixa:totals', { sessionId }),
    
    // Catalog events
    onCatalogUpdated: (callback: () => void) => {
      const subscription = (_event: any, _data: any) => callback();
      ipcRenderer.on('catalog:updated', subscription);
      return () => ipcRenderer.removeListener('catalog:updated', subscription);
    },
  },
  sync: {
    loadCatalog: () => ipcRenderer.invoke('load-catalog'),
    syncNow: () => ipcRenderer.invoke('sync-now'),
    getStatus: () => ipcRenderer.invoke('get-sync-status'),
  },
});

// TypeScript declaration
declare global {
  interface Window {
    electron: {
      auth: {
        validateSupervisor: (password: string) => Promise<boolean>;
      };
      db: {
        getProducts: () => Promise<any[]>;
        getProductByBarcode: (barcode: string) => Promise<any>;
        getProductByCode: (codigo: string) => Promise<any>;
        getUsers: () => Promise<any[]>;
        validateUser: (email: string, password: string) => Promise<any>;
        validateUserByIdOrEmail: (identifier: string, password: string) => Promise<any>;
        saveCatalog: (data: any) => Promise<void>;
        saveOrder: (order: any) => Promise<{ uuid: string; ccf: string; coo: string }>;
        cancelSale: (saleData: any) => Promise<{ uuid: string; ccf: string; coo: string; status: string }>;
        getPendingOrders: () => Promise<any[]>;
        getRecentSales: (limit?: number) => Promise<any[]>;
        saveCashMovement: (movement: any) => Promise<void>;
        getCashBalance: () => Promise<number>;
        getPendingMovements: () => Promise<any[]>;
        
        // Caixa
        abrirCaixa: (data: { operatorId: number; operatorName: string; initialAmount: number }) => Promise<{ success: boolean; session?: any; receiptHtml?: string; error?: string }>;
        fecharCaixa: (data: { sessionId: number; finalAmount: number }) => Promise<{ success: boolean; result?: any; zReportHtml?: string; error?: string }>;
        sangria: (data: { sessionId: number; amount: number; reason: string; operatorName: string }) => Promise<{ success: boolean; movement?: any; error?: string }>;
        suprimento: (data: { sessionId: number; amount: number; reason: string; operatorName: string }) => Promise<{ success: boolean; movement?: any; error?: string }>;
        getCaixaStatus: (operatorId: number) => Promise<{ isOpen: boolean; session?: any; error?: string }>;
        getCaixaTotals: (sessionId: number) => Promise<{ success: boolean; totals?: any; error?: string }>;
        
        onCatalogUpdated: (callback: () => void) => () => void;
      };
      sync: {
        loadCatalog: () => Promise<boolean>;
        syncNow: () => Promise<any>;
        getStatus: () => Promise<any>;
      };
    };
  }
}
