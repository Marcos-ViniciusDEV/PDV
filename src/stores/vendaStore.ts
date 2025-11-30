import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: number;
  name: string;
  price: number;
  barcode: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface VendaState {
  items: CartItem[];
  discount: number;
  addItem: (product: Product) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  setDiscount: (value: number) => void;
  clear: () => void;
  getTotal: () => number;
  getDiscount: () => number;
  getNetTotal: () => number;
  cancelSale: (operatorId: number, operatorName: string) => Promise<void>;
}

export const useVendaStore = create<VendaState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,

      addItem: (product) => {
        const items = get().items;
        const existingIndex = items.findIndex((item) => item.id === product.id);
        const quantityToAdd = (product as any).quantity || 1;

        if (existingIndex >= 0) {
          // Incrementar quantidade
          const newItems = [...items];
          newItems[existingIndex].quantity += quantityToAdd;
          set({ items: newItems });
        } else {
          // Adicionar novo item
          set({ items: [...items, { ...product, quantity: quantityToAdd }] });
        }
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQuantity: (index, quantity) => {
        set((state) => {
          const newItems = [...state.items];
          newItems[index].quantity = quantity;
          return { items: newItems };
        });
      },

      setDiscount: (value) => {
        set({ discount: value });
      },

      clear: () => {
        set({ items: [], discount: 0 });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscount: () => {
        return get().discount;
      },

      getNetTotal: () => {
        const total = get().getTotal();
        const discount = get().getDiscount();
        return Math.max(0, total - discount);
      },

      cancelSale: async (operatorId, operatorName) => {
        const { items, discount } = get();
        
        if (items.length === 0) return;

        try {
          await window.electron.db.cancelSale({
            operatorId,
            operatorName,
            pdvId: 'PDV-01', // TODO: Pegar do config
            items: items.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              unitPrice: item.price,
              discount: 0 // Desconto por item não implementado ainda
            })),
            discount
          });
          
          get().clear();
        } catch (error) {
          console.error('Erro ao cancelar venda:', error);
          throw error;
        }
      },
    }),
    {
      name: 'venda-storage',
      partialize: (state) => ({ items: state.items, discount: state.discount }),
    }
  )
);
