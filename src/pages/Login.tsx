import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
