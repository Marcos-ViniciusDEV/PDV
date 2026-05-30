import { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  className?: string;
}

type SyncStatus = 'checking' | 'synced' | 'server-only' | 'offline';

type LinkedPdv = {
  pdvId: string;
  empresaCnpj?: string | null;
};

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<SyncStatus>('checking');
  const [linkedPdv, setLinkedPdv] = useState<LinkedPdv | null>(null);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setStatus('checking');

    try {
      const config = await window.electron.sync.getConfig();
      if (!config?.pdvId || !config?.tokenAutenticacao) {
        setLinkedPdv(null);
        setStatus('server-only');
        return;
      }

      setLinkedPdv({
        pdvId: String(config.pdvId),
        empresaCnpj: config.empresaCnpj,
      });

      const baseUrl = config.urlBackend || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/pdv/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.tokenAutenticacao}`,
        },
        body: JSON.stringify({
          pdvId: String(config.pdvId),
          name: `PDV ${config.pdvId}`,
          location: config.empresaNome || config.empresaCnpj || 'Empresa configurada',
        }),
        signal: AbortSignal.timeout(3000),
      });

      setStatus(response.ok ? 'synced' : 'server-only');
    } catch {
      setStatus('offline');
    }
  };

  const label = status === 'checking'
    ? 'Verificando...'
    : status === 'synced'
      ? 'Sincronizado'
      : status === 'server-only'
        ? 'Nao sincronizado'
        : 'Offline';

  return (
    <div className={`connection-status ${className}`}>
      <div className={`status-indicator ${status}`}>
        <div className="status-dot" />
        <div>
          <span className="status-text">{label}</span>
          {linkedPdv && (
            <span className="status-details">
              PDV {linkedPdv.pdvId} | CNPJ {linkedPdv.empresaCnpj || 'nao informado'}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .connection-status {
          display: inline-flex;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex: 0 0 auto;
        }

        .status-indicator.synced .status-dot {
          background: #4caf50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
        }

        .status-indicator.server-only .status-dot,
        .status-indicator.checking .status-dot {
          background: #ff9800;
        }

        .status-indicator.offline .status-dot {
          background: #f44336;
        }

        .status-text,
        .status-details {
          display: block;
          color: #333;
          font-size: 13px;
          font-weight: 600;
        }

        .status-details {
          color: #666;
          font-size: 11px;
          font-weight: 500;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
