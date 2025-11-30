import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function FechamentoCaixa() {
  const [totals, setTotals] = useState<any>(null);
  const [finalAmount, setFinalAmount] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const status = await window.electron.db.getCaixaStatus(user.id);
        
        if (!status.isOpen || !status.session) {
          navigate('/abertura-caixa');
          return;
        }

        setSessionId(status.session.id);

        const result = await window.electron.db.getCaixaTotals(status.session.id);
        if (result.success) {
          setTotals(result.totals);
        } else {
          setError('Erro ao carregar totais');
        }
      } catch (err) {
        console.error('Error loading closure data:', err);
        setError('Erro ao carregar dados do fechamento');
      }
    };

    loadData();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !user) return;

    setLoading(true);
    setError('');

    try {
      // Validate operator password
      const isValid = await window.electron.db.validateUserByIdOrEmail(user.email, operatorPassword);
      if (!isValid) {
        throw new Error('Senha do operador incorreta');
      }

      const numericAmount = parseFloat(finalAmount.replace(',', '.'));
      if (isNaN(numericAmount)) {
        throw new Error('Valor inválido');
      }
      const amountInCents = Math.round(numericAmount * 100);

      const result = await window.electron.db.fecharCaixa({
        sessionId,
        finalAmount: amountInCents,
      });

      if (result.success) {
        if (result.zReportHtml) {
          printReceipt(result.zReportHtml);
        }
        logout();
        navigate('/login');
      } else {
        setError(result.error || 'Erro ao fechar caixa');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (html: string) => {
    const width = 400;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const printWindow = window.open("", "_blank", `width=${width},height=${height},top=${top},left=${left}`);

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (!totals) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: '800px' }}>
        <h1>Fechamento de Caixa</h1>
        <p className="subtitle">Confira os valores e encerre a sessão</p>
        
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '12px', 
            borderRadius: 'var(--border-radius-sm)',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--border-radius)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Resumo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Vendas ({totals.salesCount}):</span>
                <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatMoney(totals.salesTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suprimentos:</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{formatMoney(totals.suppliesTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sangrias:</span>
                <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{formatMoney(totals.bleedsTotal)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700' }}>
                <span>Saldo Esperado:</span>
                <span>{formatMoney(totals.netTotal)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--border-radius)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Pagamentos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(totals.paymentMethods).map(([method, amount]: [string, any]) => (
                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{method}:</span>
                  <span style={{ fontWeight: '500' }}>{formatMoney(amount)}</span>
                </div>
              ))}
              {Object.keys(totals.paymentMethods).length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  Nenhuma venda registrada
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <div className="form-group">
            <label style={{ fontSize: '16px', marginBottom: '12px' }}>Valor em Gaveta (Contagem Cega)</label>
            <input
              type="number"
              step="0.01"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="0,00"
              required
              autoFocus
              style={{ fontSize: '24px', textAlign: 'center', fontWeight: 'bold', padding: '16px' }}
            />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Informe o valor total em dinheiro encontrado na gaveta.
            </p>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '16px', marginBottom: '12px' }}>Senha do Operador</label>
            <input
              type="password"
              value={operatorPassword}
              onChange={(e) => setOperatorPassword(e.target.value)}
              placeholder="Senha (6 dígitos)"
              required
              style={{ fontSize: '24px', textAlign: 'center', padding: '12px', letterSpacing: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate('/pdv')}
              className="btn-logout"
              style={{ width: '100%', justifyContent: 'center', height: '48px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ backgroundColor: 'var(--danger)', height: '48px' }}
            >
              {loading ? 'Encerrando...' : 'Encerrar Caixa e Emitir Z'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
