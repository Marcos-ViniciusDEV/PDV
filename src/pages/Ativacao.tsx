import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, Link, Monitor } from 'lucide-react';
import { connectToServer } from '../lib/websocket';

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

export default function Ativacao() {
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [tokenAutenticacao, setTokenAutenticacao] = useState('');
  const [pdvId, setPdvId] = useState('');
  const [urlBackend, setUrlBackend] = useState('http://localhost:3000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAtivar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanCnpj = cnpjEmpresa.trim();
      const cleanPdvId = pdvId.trim();
      const cleanToken = tokenAutenticacao.trim();
      const cleanUrlBackend = urlBackend.trim() || 'http://localhost:3000';

      const empresaId = getEmpresaIdFromToken(cleanToken);
      if (!empresaId) {
        throw new Error('Token de sincronizacao invalido. Gere o token no ERP e cole aqui.');
      }

      const success = await window.electron.sync.saveTenantConfig({
        empresaId,
        empresaNome: 'Empresa vinculada',
        empresaCnpj: cleanCnpj,
        pdvId: cleanPdvId,
        tokenAutenticacao: cleanToken,
        urlBackend: cleanUrlBackend,
      });

      if (!success) {
        throw new Error('Erro ao salvar as configuracoes locais');
      }

      await window.electron.sync.loadCatalog();
      await connectToServer();
      navigate('/');
    } catch (err: any) {
      const isNetworkError = err.message === 'Failed to fetch';
      setError(isNetworkError ? 'Nao foi possivel conectar ao ERP. Verifique se o servidor esta aberto e se a URL esta correta.' : err.message || 'Falha na conexao com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box activation-box">
        <h1>Ativacao do PDV</h1>
        <p className="subtitle">Vincule este terminal a sua empresa</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleAtivar}>
          <div className="form-group">
            <label className="field-label-with-icon">
              <Link size={16} />
              Servidor do ERP
            </label>
            <input
              type="url"
              value={urlBackend}
              onChange={(e) => setUrlBackend(e.target.value)}
              placeholder="http://localhost:3000"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="field-label-with-icon">
              <Building2 size={16} />
              CNPJ da empresa
            </label>
            <input
              type="text"
              value={cnpjEmpresa}
              onChange={(e) => setCnpjEmpresa(e.target.value)}
              placeholder="00.000.000/0001-00"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="field-label-with-icon">
              <Monitor size={16} />
              ID deste terminal
            </label>
            <input
              type="text"
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
              placeholder="Ex: CAIXA-01"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="field-label-with-icon">
              <KeyRound size={16} />
              Token de sincronizacao
            </label>
            <input
              type="password"
              value={tokenAutenticacao}
              onChange={(e) => setTokenAutenticacao(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary activation-submit" disabled={loading}>
            {loading ? 'Validando...' : 'Ativar terminal'}
          </button>
        </form>
      </div>
    </div>
  );
}
