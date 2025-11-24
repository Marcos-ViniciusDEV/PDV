import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function InitialLoad() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Iniciando...');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setStatus('Conectando ao servidor...');
      setProgress(10);

      // Tentar sincronizar com o servidor
      const success = await window.electron.sync.loadCatalog();
      
      if (success) {
        setProgress(100);
        setStatus('Carga concluída!');
      } else {
        // Se falhar, continuar em modo offline
        setProgress(100);
        setStatus('Modo offline - usando dados locais');
        console.warn('[InitialLoad] Falha na sincronização, continuando em modo offline');
      }

      // Sempre navegar para login após 1 segundo
      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (err: unknown) {
      // Mesmo com erro, permitir continuar em modo offline
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      console.error('Erro na carga inicial:', err);
      
      setProgress(100);
      setStatus('Modo offline - usando dados locais');
      
      // Navegar para login mesmo com erro
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    }
  };

  return (
    <div className="login-container">
      <ConnectionStatus />
      <div className="login-box" style={{ maxWidth: '500px' }}>
        <h1>PDV Offline</h1>
        <p className="subtitle">Carregando dados do sistema</p>

        <div style={{ marginTop: '40px' }}>
          <div style={{
            width: '100%',
            height: '40px',
            background: '#e0e0e0',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '20px'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {progress}%
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px'
          }}>
            {status}
          </div>

          {progress < 100 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '20px'
            }}>
              <div className="loading-dot"></div>
              <div className="loading-dot" style={{ animationDelay: '0.2s' }}></div>
              <div className="loading-dot" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .loading-dot {
          width: 12px;
          height: 12px;
          background: #667eea;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
