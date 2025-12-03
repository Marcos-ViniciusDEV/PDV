import { useState, useEffect } from 'react';
import { useVendaStore } from '../../stores/vendaStore';

interface ModalRecuperarVendaProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalRecuperarVenda({ onClose, onSuccess }: ModalRecuperarVendaProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useVendaStore();

  useEffect(() => {
    loadSuspendedSales();
  }, []);

  const loadSuspendedSales = async () => {
    try {
      const result = await window.electron.db.getSuspendedSales();
      setSales(result);
    } catch (error) {
      console.error("Error loading suspended sales:", error);
      alert("Erro ao carregar vendas suspensas");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (sale: any) => {
    if (!window.confirm(`Deseja recuperar a venda de ${new Date(sale.createdAt).toLocaleString()}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const items = await window.electron.db.getSaleItems(sale.id);
      
      // 2. Add items to cart
      items.forEach((item: any) => {
        addItem({
          id: item.productId,
          name: item.productName || `Produto ${item.productId}`,
          price: item.unitPrice,
          barcode: "", // Dummy barcode
          quantity: item.quantity,
        } as any);
      });

      // 3. Delete suspended sale
      await window.electron.db.deleteSuspendedSale(sale.uuid);

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error recovering sale:", error);
      alert("Erro ao recuperar venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <h2>Recuperar Venda Suspensa</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Carregando...</div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            Nenhuma venda suspensa encontrada.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Data/Hora</th>
                  <th style={{ padding: '10px' }}>Operador</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px' }}>{new Date(sale.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{sale.operatorName}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {(sale.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRecover(sale)}
                        className="btn-primary"
                        style={{ padding: '5px 10px', fontSize: '14px' }}
                      >
                        Recuperar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button onClick={onClose} className="btn-logout" style={{ width: '100%' }}>
            Fechar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
