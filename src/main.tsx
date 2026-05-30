import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

function BrowserRedirect() {
  React.useEffect(() => {
    window.location.replace('http://localhost:5173/pdv/online');
  }, []);

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: '520px', textAlign: 'center' }}>
        <h1>Abrindo PDV Online</h1>
        <p className="subtitle">Redirecionando para o ERP...</p>
        <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginTop: '24px' }}>
          O navegador usa o PDV Online. O aplicativo instalado continua reservado
          para o PDV Desktop offline.
        </p>
      </div>
    </div>
  );
}

const isElectron = Boolean(window.electron?.db && window.electron?.sync);
const root = ReactDOM.createRoot(document.getElementById('root')!);

if (!isElectron) {
  root.render(
    <React.StrictMode>
      <BrowserRedirect />
    </React.StrictMode>
  );
} else {
  void import('./lib/websocket');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
