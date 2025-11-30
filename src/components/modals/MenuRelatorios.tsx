import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuthStore } from '../../stores/authStore'; // Removed unused import

interface MenuRelatoriosProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MenuRelatorios({ isOpen, onClose }: MenuRelatoriosProps) {
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'PASSWORD' | 'MENU'>('PASSWORD');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  // const { user } = useAuthStore(); // Removed unused variable

  useEffect(() => {
    if (isOpen) {
      setStep('PASSWORD');
      setPassword('');
      setError('');
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

  const handleOption = (option: 'Z_REPORT' | 'CLOSE_REGISTER') => {
    if (option === 'CLOSE_REGISTER') {
      navigate('/fechamento-caixa');
      onClose();
    } else if (option === 'Z_REPORT') {
      // TODO: Implement view Z Report without closing
      // For now, maybe just navigate to closure or show a modal
      alert('Funcionalidade de visualização de Z em breve. Use o Fechamento de Caixa.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: step === 'PASSWORD' ? '350px' : '500px' }}>
        <h2>{step === 'PASSWORD' ? 'Acesso Restrito' : 'Menu de Relatórios'}</h2>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                onClick={() => handleOption('CLOSE_REGISTER')}
                className="menu-item"
                style={{ 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  gap: '12px',
                  textAlign: 'center',
                  height: '140px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontSize: '32px' }}>⚠️</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>Fechar Caixa (Z)</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Encerrar dia</span>
                </div>
              </button>

              <button
                onClick={() => handleOption('Z_REPORT')}
                className="menu-item"
                style={{ 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  gap: '12px',
                  textAlign: 'center',
                  height: '140px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
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
