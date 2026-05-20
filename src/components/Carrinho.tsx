import { useState, useEffect } from 'react';
import { useVendaStore } from '../stores/vendaStore';

export default function Carrinho() {
  const { items } = useVendaStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour12: false });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2)}`;
  };

  return (
    <div className="carrinho">
      <div className="carrinho-header">
        <h2>
          <span>🛒</span>
          Itens da Venda
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{items.length} itens</span>
      </div>

      <div className="carrinho-items">
        {items.length === 0 ? (
          <div className="caixa-livre-container">
            <div className="caixa-livre-card">
              <h2 className="caixa-livre-title">Caixa Livre</h2>
              <div className="caixa-livre-time">{formatTime(time)}</div>
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                <th style={{ width: '50%' }}>Produto</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Qtd</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Unitário</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {index + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.barcode || 'Sem código'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="quantity-badge" style={{ 
                      background: 'var(--bg-primary)', 
                      padding: '4px 12px', 
                      borderRadius: '6px', 
                      fontWeight: 600,
                      border: '1px solid var(--border-color)'
                    }}>
                      {item.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
      
      {useVendaStore.getState().getDiscount() > 0 && (
        <div className="carrinho-footer" style={{ 
          padding: '16px', 
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(useVendaStore.getState().getTotal())}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--danger)' }}>
            <span>Desconto</span>
            <span>- {formatCurrency(useVendaStore.getState().getDiscount())}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
            <span>Total</span>
            <span>{formatCurrency(useVendaStore.getState().getNetTotal())}</span>
          </div>
        </div>
      )}
    </div>
  );
}
