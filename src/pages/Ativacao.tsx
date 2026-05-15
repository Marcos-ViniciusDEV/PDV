import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Ativacao() {
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [senhaAtivacao, setSenhaAtivacao] = useState('');
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
      const response = await fetch(`${urlBackend}/api/empresas/pdv/ativar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigoEmpresa: codigoEmpresa.toUpperCase(),
          senhaAtivacao,
          pdvId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao ativar o PDV');
      }

      // Salvar na tabela local via IPC
      const success = await window.electron.sync.saveTenantConfig({
        empresaId: data.empresa.id,
        empresaNome: data.empresa.nomeFantasia || data.empresa.razaoSocial,
        pdvId: data.pdvId,
        tokenAutenticacao: data.token,
        urlBackend,
      });

      if (!success) {
        throw new Error('Erro ao salvar as configurações locais');
      }

      // Sucesso! Redirecionar para o InitialLoad para baixar os produtos
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha na conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: '500px' }}>
        <h1>Ativação do PDV</h1>
        <p className="subtitle">Vincule este terminal à sua empresa</p>

        {error && (
          <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAtivar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>🌐 Servidor do ERP (URL)</label>
            <input
              type="url"
              value={urlBackend}
              onChange={(e) => setUrlBackend(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>🏢 Código da Empresa</label>
            <input
              type="text"
              value={codigoEmpresa}
              onChange={(e) => setCodigoEmpresa(e.target.value)}
              className="login-input"
              placeholder="Ex: LOJA-X123"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>💻 ID deste Terminal (Caixa)</label>
            <input
              type="text"
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
              className="login-input"
              placeholder="Ex: CAIXA-01"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>🔒 Senha de Ativação</label>
            <input
              type="password"
              value={senhaAtivacao}
              onChange={(e) => setSenhaAtivacao(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Validando e Registrando...' : 'Ativar Terminal'}
          </button>
        </form>
      </div>
    </div>
  );
}
