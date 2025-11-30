import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface SangriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  type: 'SANGRIA' | 'SUPRIMENTO';
}

export default function SangriaModal({ isOpen, onClose, sessionId, type }: SangriaModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const numericAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Valor inválido');
      }
      const amountInCents = Math.round(numericAmount * 100);

      const data = {
        sessionId,
        amount: amountInCents,
        reason,
        operatorName: user.name,
        operatorId: user.id,
      };

      let result;
      if (type === 'SANGRIA') {
        result = await window.electron.db.sangria(data);
      } else {
        result = await window.electron.db.suprimento(data);
      }

      if (result.success) {
        if (result.receiptHtml) {
          printReceipt(result.receiptHtml);
        }
        onClose();
        setAmount('');
        setReason('');
      } else {
        setError(result.error || `Erro ao realizar ${type.toLowerCase()}`);
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{type === 'SANGRIA' ? 'Realizar Sangria' : 'Realizar Suprimento'}</h2>

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
            <label>Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              autoFocus
              style={{ fontSize: '20px', fontWeight: 'bold' }}
            />
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pagamento de fornecedor"
              rows={3}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '15px',
                borderRadius: 'var(--border-radius-sm)',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-logout"
              style={{ justifyContent: 'center' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ backgroundColor: type === 'SANGRIA' ? 'var(--danger)' : 'var(--success)' }}
            >
              {loading ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
