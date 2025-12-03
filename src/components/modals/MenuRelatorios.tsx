import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalRelatorioX from './ModalRelatorioX';

interface MenuRelatoriosProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: number | null;
}

export default function MenuRelatorios({ isOpen, onClose, sessionId }: MenuRelatoriosProps) {
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'PASSWORD' | 'MENU'>('PASSWORD');
  const [error, setError] = useState('');
  const [showRelatorioX, setShowRelatorioX] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setStep('PASSWORD');
      setPassword('');
      setError('');
      setShowRelatorioX(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate if the password belongs to a supervisor/admin
      const isValid = await window.electron.auth.validateSupervisor(password);
      if (isValid) {
        setStep('MENU');
        setError('');
      } else {
        setError('Senha de supervisor incorreta');
      }
    } catch (err) {
      setError('Erro ao validar senha');
    }
  };

  const handleOption = async (option: 'Z_REPORT' | 'CLOSE_REGISTER' | 'X_REPORT') => {
    if (option === 'CLOSE_REGISTER') {
      navigate('/fechamento-caixa');
      onClose();
    } else if (option === 'Z_REPORT') {
      try {
        const result = await window.electron.db.getDailyZReport();
        if (result.success && result.zReportHtml) {
          printReceipt(result.zReportHtml);
          onClose();
        } else {
          alert('Erro ao gerar Redução Z: ' + (result.error || 'Erro desconhecido'));
        }
      } catch (err) {
        console.error('Error generating Z report:', err);
        alert('Erro ao gerar Redução Z');
      }
    } else if (option === 'X_REPORT') {
      if (!sessionId) {
        alert('Sessão não identificada');
        return;
      }
      setShowRelatorioX(true);
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

  if (showRelatorioX && sessionId) {
    return (
      <ModalRelatorioX 
        sessionId={sessionId} 
        onClose={() => {
          setShowRelatorioX(false);
          // onClose(); // Keep menu open or close it? Let's keep menu open or just close modal.
          // Usually X report is quick check. Let's just close modal and return to menu.
        }} 
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: step === 'PASSWORD' ? '350px' : '600px' }}>
        <h2>{step === 'PASSWORD' ? 'Acesso Restrito' : 'O que deseja fazer?'}</h2>

        {step === 'PASSWORD' ? (
          <>
            <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Digite a senha do supervisor para acessar
            </p>
            <form onSubmit={handlePasswordSubmit}>
              {error && (
                <div style={{ 
                  color: "var(--danger)", 
                  textAlign: "center", 
                  marginBottom: "15px", 
                  fontWeight: 500 
                }}>
                  {error}
                </div>
              )}
              <div className="form-group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  placeholder="Senha (6 dígitos)"
                  style={{ textAlign: "center", letterSpacing: "4px", fontSize: "24px" }}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-logout"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Acessar
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="util-options" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <button
                onClick={() => handleOption('X_REPORT')}
                className="menu-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '32px' }}>📊</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>Relatório X</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Parcial Sessão</span>
                </div>
              </button>

              <button
                onClick={() => handleOption('CLOSE_REGISTER')}
                className="menu-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '32px' }}>⚠️</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>Fechar Caixa</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Encerrar dia</span>
                </div>
              </button>

              <button
                onClick={() => handleOption('Z_REPORT')}
                className="menu-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '32px' }}>📄</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>Relatório Z</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Visualizar</span>
                </div>
              </button>
            </div>

            <button
              onClick={onClose}
              className="btn-logout"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
