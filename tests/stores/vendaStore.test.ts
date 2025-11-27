import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVendaStore } from '../../src/stores/vendaStore';


// Declare window.electron type
declare global {
  interface Window {
    electron: {
      db: {
        cancelSale: any;
      };
    };
  }
}

// Mock window.electron
(global as any).window = {
  electron: {
    db: {
      cancelSale: vi.fn(),
    },
  },
};

describe('VendaStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useVendaStore.setState({ items: [], discount: 0 });
    vi.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add new item to cart', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      
      const items = useVendaStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ ...product, quantity: 1 });
    });

    it('should increment quantity for existing item', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().addItem(product);
      
      const items = useVendaStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('should add item with custom quantity', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123', quantity: 5 } as any;
      
      useVendaStore.getState().addItem(product);
      
      const items = useVendaStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().removeItem(0);
      
      const items = useVendaStore.getState().items;
      expect(items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().updateQuantity(0, 5);
      
      const items = useVendaStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('setDiscount', () => {
    it('should set discount value', () => {
      useVendaStore.getState().setDiscount(10);
      
      expect(useVendaStore.getState().discount).toBe(10);
    });
  });

  describe('clear', () => {
    it('should clear cart and discount', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().setDiscount(5);
      useVendaStore.getState().clear();
      
      expect(useVendaStore.getState().items).toHaveLength(0);
      expect(useVendaStore.getState().discount).toBe(0);
    });
  });

  describe('getTotal', () => {
    it('should calculate total correctly', () => {
      const product1 = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      const product2 = { id: 2, name: 'Product 2', price: 20, barcode: '456' };
      
      useVendaStore.getState().addItem(product1);
      useVendaStore.getState().addItem(product2);
      useVendaStore.getState().updateQuantity(0, 2); // 2 x 10 = 20
      
      const total = useVendaStore.getState().getTotal();
      expect(total).toBe(40); // (2 * 10) + (1 * 20)
    });
  });

  describe('getNetTotal', () => {
    it('should calculate net total with discount', () => {
      const product = { id: 1, name: 'Product 1', price: 100, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().setDiscount(10);
      
      const netTotal = useVendaStore.getState().getNetTotal();
      expect(netTotal).toBe(90); // 100 - 10
    });

    it('should not return negative values', () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().setDiscount(20);
      
      const netTotal = useVendaStore.getState().getNetTotal();
      expect(netTotal).toBe(0); // Max(0, 10 - 20)
    });
  });

  describe('cancelSale', () => {
    it('should call electron API and clear cart', async () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      useVendaStore.getState().setDiscount(5);
      
      vi.mocked(window.electron.db.cancelSale).mockResolvedValue(undefined);
      
      await useVendaStore.getState().cancelSale(1, 'Test Operator');
      
      expect(window.electron.db.cancelSale).toHaveBeenCalledWith({
        operatorId: 1,
        operatorName: 'Test Operator',
        pdvId: 'PDV-01',
        items: [{ productId: 1, quantity: 1, unitPrice: 10, discount: 0 }],
        discount: 5,
      });
      
      expect(useVendaStore.getState().items).toHaveLength(0);
      expect(useVendaStore.getState().discount).toBe(0);
    });

    it('should not call API if cart is empty', async () => {
      await useVendaStore.getState().cancelSale(1, 'Test Operator');
      
      expect(window.electron.db.cancelSale).not.toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      const product = { id: 1, name: 'Product 1', price: 10, barcode: '123' };
      
      useVendaStore.getState().addItem(product);
      
      vi.mocked(window.electron.db.cancelSale).mockRejectedValue(new Error('API Error'));
      
      await expect(
        useVendaStore.getState().cancelSale(1, 'Test Operator')
      ).rejects.toThrow('API Error');
    });
  });
});
