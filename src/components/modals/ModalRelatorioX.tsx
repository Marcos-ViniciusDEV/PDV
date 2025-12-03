import { useState, useEffect } from 'react';

interface ModalRelatorioXProps {
  onClose: () => void;
  sessionId: number;
}

export default function ModalRelatorioX({ onClose, sessionId }: ModalRelatorioXProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      const result = await window.electron.db.getCaixaTotals(sessionId);
      if (result.success && result.totals) {
        setData(result.totals);
      } else {
        setError(result.error || 'Erro ao carregar dados');
      }
    } catch (err) {
      console.error('Error loading X report:', err);
      setError('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!sessionId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <h2>Relatório X (Parcial)</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Carregando...</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '20px' }}>{error}</div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="info-card" style={{ padding: '15px' }}>
                <span className="label">Total Vendas</span>
                <span className="value" style={{ color: 'var(--success)' }}>{formatCurrency(data.salesTotal)}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{data.salesCount} vendas</span>
              </div>
              <div className="info-card" style={{ padding: '15px' }}>
                <span className="label">Saldo Líquido</span>
                <span className="value">{formatCurrency(data.netTotal)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="info-card" style={{ padding: '15px' }}>
                <span className="label">Sangrias</span>
                <span className="value" style={{ color: 'var(--danger)' }}>{formatCurrency(data.bleedsTotal)}</span>
              </div>
              <div className="info-card" style={{ padding: '15px' }}>
                <span className="label">Suprimentos</span>
                <span className="value" style={{ color: 'var(--primary)' }}>{formatCurrency(data.suppliesTotal)}</span>
              </div>
            </div>

            <div className="info-card" style={{ padding: '15px' }}>
              <span className="label" style={{ marginBottom: '10px', display: 'block' }}>Por Método de Pagamento</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.paymentMethods).map(([method, amount]: [string, any]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                    <span>{method}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(amount)}</span>
                  </div>
                ))}
                {Object.keys(data.paymentMethods).length === 0 && (
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhuma venda registrada</span>
                )}
              </div>
            </div>

          </div>
        ) : null}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button onClick={onClose} className="btn-logout" style={{ width: '100%' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
