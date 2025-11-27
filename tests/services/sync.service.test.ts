import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as syncService from '../../electron/services/sync.service';
import * as apiClient from '../../electron/http/api-client';
import * as catalogService from '../../electron/services/catalog.service';
import * as salesService from '../../electron/services/sales.service';
import * as cashService from '../../electron/services/cash.service';

// Mock all dependencies
vi.mock('../../electron/http/api-client', () => ({
  fetchCatalog: vi.fn(),
  checkHealth: vi.fn(),
  syncBatch: vi.fn(),
}));

vi.mock('../../electron/services/catalog.service', () => ({
  loadCatalog: vi.fn(),
}));

vi.mock('../../electron/services/sales.service', () => ({
  getPendingSales: vi.fn(),
  getSaleItems: vi.fn(),
  markSalesAsSynced: vi.fn(),
}));

vi.mock('../../electron/services/cash.service', () => ({
  getPendingMovements: vi.fn(),
  markMovementsAsSynced: vi.fn(),
}));

describe('Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadCatalog', () => {
    it('should load catalog successfully', async () => {
      const mockCatalog = { produtos: [], usuarios: [] };
      vi.mocked(apiClient.fetchCatalog).mockResolvedValue(mockCatalog);
      vi.mocked(catalogService.loadCatalog).mockResolvedValue(undefined);

      const result = await syncService.loadCatalog();

      expect(result).toBe(true);
      expect(apiClient.fetchCatalog).toHaveBeenCalled();
      expect(catalogService.loadCatalog).toHaveBeenCalledWith(mockCatalog);
    });

    it('should return false on error', async () => {
      vi.mocked(apiClient.fetchCatalog).mockRejectedValue(new Error('Network error'));

      const result = await syncService.loadCatalog();

      expect(result).toBe(false);
    });
  });

  describe('checkConnection', () => {
    it('should return online status', async () => {
      vi.mocked(apiClient.checkHealth).mockResolvedValue(true);

      const result = await syncService.checkConnection();

      expect(result).toBe(true);
      expect(apiClient.checkHealth).toHaveBeenCalled();
    });

    it('should return offline status', async () => {
      vi.mocked(apiClient.checkHealth).mockResolvedValue(false);

      const result = await syncService.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('syncPendingData', () => {
    it('should skip sync when offline', async () => {
      vi.mocked(apiClient.checkHealth).mockResolvedValue(false);

      const result = await syncService.syncPendingData();

      expect(result).toEqual({ success: false, reason: 'offline' });
      expect(salesService.getPendingSales).not.toHaveBeenCalled();
    });

    it('should return success when nothing to sync', async () => {
      vi.mocked(apiClient.checkHealth).mockResolvedValue(true);
      vi.mocked(salesService.getPendingSales).mockResolvedValue([]);
      vi.mocked(cashService.getPendingMovements).mockResolvedValue([]);

      const result = await syncService.syncPendingData();

      expect(result).toEqual({ success: true, synced: 0 });
    });

    it('should sync pending sales successfully', async () => {
      const mockSale = {
        id: 1,
        uuid: 'test-uuid',
        numeroVenda: 'V001',
        ccf: '000001',
        coo: '000001',
        pdvId: 'PDV001',
        createdAt: new Date(),
        total: 100,
        discount: 0,
        netTotal: 100,
        paymentMethod: 'DINHEIRO',
        operatorId: 1,
        operatorName: 'Test',
      };

      const mockItems = [
        { productId: 1, quantity: 2, unitPrice: 50, total: 100, discount: 0 },
      ];

      vi.mocked(apiClient.checkHealth).mockResolvedValue(true);
      vi.mocked(salesService.getPendingSales).mockResolvedValue([mockSale] as any);
      vi.mocked(salesService.getSaleItems).mockResolvedValue(mockItems as any);
      vi.mocked(cashService.getPendingMovements).mockResolvedValue([]);
      vi.mocked(apiClient.syncBatch).mockResolvedValue({ success: true } as any);
      vi.mocked(salesService.markSalesAsSynced).mockResolvedValue(undefined);

      const result = await syncService.syncPendingData();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(apiClient.syncBatch).toHaveBeenCalled();
      expect(salesService.markSalesAsSynced).toHaveBeenCalledWith(['test-uuid']);
    });

    it('should handle sync errors', async () => {
      vi.mocked(apiClient.checkHealth).mockResolvedValue(true);
      vi.mocked(salesService.getPendingSales).mockRejectedValue(new Error('DB error'));

      const result = await syncService.syncPendingData();

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = syncService.getStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('pdvId');
      expect(status).toHaveProperty('lastCheck');
    });
  });
});
