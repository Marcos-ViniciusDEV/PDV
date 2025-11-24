import { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={`connection-status ${className}`}>
      <div className={`status-indicator ${isConnected ? 'online' : 'offline'} ${isChecking ? 'checking' : ''}`}>
        <div className="status-dot"></div>
        <span className="status-text">
          {isChecking ? 'Verificando...' : isConnected ? 'Online' : 'Offline'}
        </span>
      </div>

      <style>{`
        .connection-status {
          display: inline-flex;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .status-indicator:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-indicator.online .status-dot {
          background: #4caf50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
          animation: pulse-online 2s infinite;
        }

        .status-indicator.offline .status-dot {
          background: #f44336;
          box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
        }

        .status-indicator.checking .status-dot {
          background: #ff9800;
          animation: pulse-checking 1s infinite;
        }

        .status-text {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .status-indicator.online .status-text {
          color: #2e7d32;
        }

        .status-indicator.offline .status-text {
          color: #c62828;
        }

        .status-indicator.checking .status-text {
          color: #e65100;
        }

        @keyframes pulse-online {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-checking {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
