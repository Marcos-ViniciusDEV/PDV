import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ConnectionStatus } from '../components/ConnectionStatus';
import ModalConsultarPreco from '../components/modals/ModalConsultarPreco';
import { connectToServer } from '../lib/websocket';

type SyncConfigForm = {
  empresaId: string;
  empresaNome: string;
  empresaCnpj: string;
  pdvId: string;
  tokenAutenticacao: string;
  urlBackend: string;
};

const emptySyncConfig: SyncConfigForm = {
  empresaId: '',
  empresaNome: '',
  empresaCnpj: '',
  pdvId: '',
  tokenAutenticacao: '',
  urlBackend: 'http://localhost:3000',
};

function getEmpresaIdFromToken(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(normalizedPayload));
    return Number(decoded.empresaId || 0);
  } catch {
    return 0;
  }
}

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [syncConfig, setSyncConfig] = useState<SyncConfigForm>(emptySyncConfig);
  const [syncConfigLoading, setSyncConfigLoading] = useState(false);
  const [syncConfigMessage, setSyncConfigMessage] = useState('');
  const navigate = useNavigate();

  const openSyncConfig = async () => {
    setShowSyncConfig(true);
    setSyncConfigMessage('');
    setSyncConfigLoading(true);

    try {
      const config = await window.electron.sync.getConfig();
      setSyncConfig({
        empresaId: config?.empresaId ? String(config.empresaId) : '',
        empresaNome: config?.empresaNome || '',
        empresaCnpj: config?.empresaCnpj || '',
        pdvId: config?.pdvId || '',
        tokenAutenticacao: config?.tokenAutenticacao || '',
        urlBackend: config?.urlBackend || 'http://localhost:3000',
      });
    } catch (err) {
      console.error('Erro ao carregar configuracao de sincronizacao:', err);
      setSyncConfigMessage('Erro ao carregar a configuracao atual.');
    } finally {
      setSyncConfigLoading(false);
    }
  };

  const handleSyncConfigChange = (field: keyof SyncConfigForm, value: string) => {
    setSyncConfig((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSyncConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncConfigMessage('');
    setSyncConfigLoading(true);

    try {
      const empresaId = Number(syncConfig.empresaId || 0) || getEmpresaIdFromToken(syncConfig.tokenAutenticacao);
      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        throw new Error('Token de acesso invalido. Gere o token no ERP e cole aqui.');
      }

      const success = await window.electron.sync.saveTenantConfig({
        empresaId,
        empresaNome: syncConfig.empresaNome.trim() || 'Empresa vinculada',
        empresaCnpj: syncConfig.empresaCnpj.trim(),
        pdvId: syncConfig.pdvId.trim(),
        tokenAutenticacao: syncConfig.tokenAutenticacao.trim(),
        urlBackend: syncConfig.urlBackend.trim() || 'http://localhost:3000',
      });

      if (!success) {
        throw new Error('Nao foi possivel salvar a configuracao.');
      }

      const catalogLoaded = await window.electron.sync.loadCatalog();
      await connectToServer();

      setSyncConfigMessage(catalogLoaded
        ? 'Configuracao salva e usuarios sincronizados. Tente entrar novamente.'
        : 'Configuracao salva, mas nao foi possivel baixar usuarios agora. Clique em Sincronizar.');
    } catch (err: any) {
      setSyncConfigMessage(err.message || 'Erro ao salvar a configuracao.');
    } finally {
      setSyncConfigLoading(false);
    }
  };

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
      const catalogLoaded = await window.electron.sync.loadCatalog();
      const result = await window.electron.sync.syncNow();
      await connectToServer();

      if (result && result.success) {
        alert(catalogLoaded ? 'Sincronizacao concluida com sucesso!' : 'Vendas sincronizadas. Nao foi possivel baixar usuarios/produtos agora.');
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

      // F3 - Consultar Preço
      if (e.key === 'F3') {
        e.preventDefault();
        setShowPriceCheck(true);
      }

      // Space - Consultar Preço (se não estiver digitando)
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setShowPriceCheck(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="login-container">
      <ConnectionStatus />
      <div className="login-box">
        <button
          type="button"
          className="login-settings-button"
          onClick={openSyncConfig}
          aria-label="Configurar sincronizacao"
          title="Configurar sincronizacao"
          disabled={loading}
        >
          <Settings size={18} />
        </button>
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
          <button 
            type="button" 
            onClick={() => setShowPriceCheck(true)} 
            disabled={loading} 
            className="btn-secondary" 
            style={{ width: '100%', marginBottom: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
          >
            Consultar Preço (Espaço)
          </button>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      
      {showPriceCheck && (
        <ModalConsultarPreco
          onClose={() => setShowPriceCheck(false)}
        />
      )}

      {showSyncConfig && (
        <div className="modal-overlay">
          <div className="modal-content sync-config-modal">
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowSyncConfig(false)}
              aria-label="Fechar configuracao"
            >
              <X size={18} />
            </button>

            <h2>Sincronizacao</h2>
            <p className="sync-config-subtitle">Empresa vinculada a este PDV</p>

            <form onSubmit={handleSaveSyncConfig}>
              <div className="form-group">
                <label>CNPJ</label>
                <input
                  type="text"
                  value={syncConfig.empresaCnpj}
                  onChange={(e) => handleSyncConfigChange('empresaCnpj', e.target.value)}
                  placeholder="Digite o CNPJ da empresa"
                  required
                  disabled={syncConfigLoading}
                />
              </div>

              <div className="form-group">
                <label>ID do PDV</label>
                <input
                  type="text"
                  value={syncConfig.pdvId}
                  onChange={(e) => handleSyncConfigChange('pdvId', e.target.value)}
                  required
                  disabled={syncConfigLoading}
                />
              </div>

              <div className="form-group">
                <label>Token de autenticacao</label>
                <input
                  type="password"
                  value={syncConfig.tokenAutenticacao}
                  onChange={(e) => handleSyncConfigChange('tokenAutenticacao', e.target.value)}
                  required
                  disabled={syncConfigLoading}
                />
              </div>

              {syncConfigMessage && (
                <div className="sync-config-message">
                  {syncConfigMessage}
                </div>
              )}

              <div className="sync-config-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSyncConfig(false)}
                  disabled={syncConfigLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={syncConfigLoading}>
                  {syncConfigLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
