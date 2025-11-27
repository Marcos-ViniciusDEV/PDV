import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as salesService from '../../electron/services/sales.service';
import * as salesRepository from '../../electron/repositories/sales.repository';

// Mock the sales repository
vi.mock('../../electron/repositories/sales.repository', () => ({
  getNextCounters: vi.fn(),
  createSale: vi.fn(),
  getPendingSales: vi.fn(),
  getSaleItems: vi.fn(),
  markSalesAsSynced: vi.fn(),
  getRecentSales: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('Sales Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSale', () => {
    it('should create a sale with correct calculations', async () => {
      const mockCounters = { ccf: 1, coo: 1 };
      const mockSale = {
        id: 1,
        uuid: 'test-uuid-1234',
        numeroVenda: 'PDV001-000001',
        ccf: '000001',
        coo: '000001',
        total: 100,
        netTotal: 90,
        status: 'completed',
      };

      vi.mocked(salesRepository.getNextCounters).mockResolvedValue(mockCounters);
      vi.mocked(salesRepository.createSale).mockResolvedValue(mockSale as any);

      const input = {
        operatorId: 1,
        operatorName: 'Test Operator',
        pdvId: 'PDV001',
        items: [
          { productId: 1, quantity: 2, unitPrice: 50 },
        ],
        paymentMethod: 'DINHEIRO',
        discount: 10,
      };

      const result = await salesService.createSale(input);

      expect(result).toEqual({
        uuid: 'test-uuid-1234',
        numeroVenda: 'PDV001-000001',
        ccf: '000001',
        coo: '000001',
        total: 100,
        netTotal: 90,
      });

      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: 'test-uuid-1234',
          total: 100,
          discount: 10,
          netTotal: 90,
        }),
        expect.arrayContaining([
          expect.objectContaining({
            productId: 1,
            quantity: 2,
            unitPrice: 50,
          }),
        ])
      );
    });

    it('should handle multiple items correctly', async () => {
      const mockCounters = { ccf: 2, coo: 2 };
      const mockSale = {
        id: 2,
        uuid: 'test-uuid-1234',
        numeroVenda: 'PDV001-000002',
        ccf: '000002',
        coo: '000002',
        total: 150,
        netTotal: 150,
        status: 'completed',
      };

      vi.mocked(salesRepository.getNextCounters).mockResolvedValue(mockCounters);
      vi.mocked(salesRepository.createSale).mockResolvedValue(mockSale as any);

      const input = {
        operatorId: 1,
        operatorName: 'Test Operator',
        pdvId: 'PDV001',
        items: [
          { productId: 1, quantity: 2, unitPrice: 50 },
          { productId: 2, quantity: 1, unitPrice: 50 },
        ],
        paymentMethod: 'CREDITO',
      };

      const result = await salesService.createSale(input);

      expect(result.total).toBe(150);
      expect(result.netTotal).toBe(150);
    });
  });

  describe('cancelSale', () => {
    it('should create cancelled sale with CANCELADO payment method', async () => {
      const mockCounters = { ccf: 3, coo: 3 };
      const mockSale = {
        id: 3,
        uuid: 'test-uuid-1234',
        numeroVenda: 'PDV001-000003',
        ccf: '000003',
        coo: '000003',
        total: 100,
        netTotal: 100,
        status: 'cancelled',
      };

      vi.mocked(salesRepository.getNextCounters).mockResolvedValue(mockCounters);
      vi.mocked(salesRepository.createSale).mockResolvedValue(mockSale as any);

      const input = {
        operatorId: 1,
        operatorName: 'Test Operator',
        pdvId: 'PDV001',
        items: [
          { productId: 1, quantity: 2, unitPrice: 50 },
        ],
        paymentMethod: 'DINHEIRO',
      };

      const result = await salesService.cancelSale(input);

      expect(result.status).toBe('cancelled');
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'CANCELADO',
          status: 'cancelled',
        }),
        expect.any(Array)
      );
    });
  });

  describe('getPendingSales', () => {
    it('should return pending sales', async () => {
      const mockSales = [
        { id: 1, syncStatus: 'pending' },
        { id: 2, syncStatus: 'pending' },
      ];

      vi.mocked(salesRepository.getPendingSales).mockResolvedValue(mockSales as any);

      const result = await salesService.getPendingSales();

      expect(result).toEqual(mockSales);
      expect(salesRepository.getPendingSales).toHaveBeenCalled();
    });
  });
});
