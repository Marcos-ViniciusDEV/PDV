import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent | null, isZReport = false) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isZReport) {
        // Fluxo de Relatório Z Diário (sem login)
        const result = await window.electron.db.getDailyZReport();
        if (result.success && result.zReportHtml) {
          const width = 400;
          const height = 700;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
      
          const printWindow = window.open("", "_blank", `width=${width},height=${height},top=${top},left=${left}`);
      
          if (printWindow) {
            printWindow.document.write(result.zReportHtml);
            printWindow.document.close();
          }
        } else {
          setError('Erro ao gerar relatório Z: ' + (result.error || 'Desconhecido'));
        }
        setLoading(false);
        return;
      }

      // Usar nova função que aceita ID ou Email
      const user = await window.electron.db.validateUserByIdOrEmail(identifier, password);
      
      if (user) {
        // Atualizar store com dados do usuário
        useAuthStore.setState({ 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          isAuthenticated: true
        });
        
        navigate('/pdv');
      } else {
        setError('ID/Email ou senha inválidos');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await window.electron.sync.syncNow();
      if (result && result.success) {
        alert('Sincronização concluída com sucesso!');
      } else {
        setError('Erro na sincronização: ' + (result?.error || 'Desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar vendas.');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut for Z Report
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.altKey && !e.metaKey && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        handleLogin(null, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="login-container">
      <ConnectionStatus />
      <div className="login-box">
        <h1>PDV Offline</h1>
        <p className="subtitle">Sistema de Ponto de Venda</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>ID ou Email:</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Digite seu ID ou email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Senha:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button type="button" onClick={() => handleLogin(null, true)} disabled={loading} className="btn-secondary" style={{ flex: 1 }}>
              Relatório Z
            </button>
            <button type="button" onClick={handleSync} disabled={loading} className="btn-secondary" style={{ flex: 1 }}>
              Sincronizar
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
