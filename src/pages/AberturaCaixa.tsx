import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AberturaCaixa() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Check if already open
    if (user) {
      window.electron.db.getCaixaStatus(user.id).then((status) => {
        if (status.isOpen) {
          navigate('/pdv');
        }
      });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Convert string amount (e.g. "100,00") to cents (10000)
      const numericAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numericAmount)) {
        throw new Error('Valor inválido');
      }
      const amountInCents = Math.round(numericAmount * 100);

      const result = await window.electron.db.abrirCaixa({
        operatorId: user.id,
        operatorName: user.name,
        initialAmount: amountInCents,
      });

      if (result.success) {
        if (result.receiptHtml) {
          printReceipt(result.receiptHtml);
        }
        navigate('/pdv');
      } else {
        setError(result.error || 'Erro ao abrir caixa');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (html: string) => {
    const width = 400;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const printWindow = window.open("", "_blank", `width=${width},height=${height},top=${top},left=${left}`);

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Abertura de Caixa</h1>
        <p className="subtitle">Informe o fundo de troco para iniciar</p>
        
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Fundo de Troco (R$)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              autoFocus
              style={{ fontSize: '24px', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: '10px' }}
          >
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </form>
      </div>
    </div>
  );
}
