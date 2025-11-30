import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface MenuFuncoesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'SANGRIA' | 'SUPRIMENTO') => void;
}

export default function MenuFuncoes({ isOpen, onClose, onSelect }: MenuFuncoesProps) {
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'PASSWORD' | 'MENU'>('PASSWORD');
  const [error, setError] = useState('');
  const { user } = useAuthStore();

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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: step === 'PASSWORD' ? '350px' : '500px' }}>
        <h2>{step === 'PASSWORD' ? 'Acesso Restrito' : 'Menu de Funções'}</h2>

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
                onClick={() => onSelect('SANGRIA')}
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
                <span style={{ fontSize: '32px', color: 'var(--danger)' }}>-</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Sangria</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Retirada</span>
                </div>
              </button>

              <button
                onClick={() => onSelect('SUPRIMENTO')}
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
                <span style={{ fontSize: '32px', color: 'var(--success)' }}>+</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Suprimento</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Entrada</span>
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
