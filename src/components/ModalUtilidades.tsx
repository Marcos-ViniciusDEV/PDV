import { useState, useEffect } from "react";

interface ModalUtilidadesProps {
  onClose: () => void;
}

export default function ModalUtilidades({ onClose }: ModalUtilidadesProps) {
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      switch (e.key) {
        case "1":
          handleSync();
          break;
        case "2":
          handleLoadCatalog();
          break;
        case "3":
          alert("Funcionalidade em desenvolvimento");
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  const handleSync = async () => {
    setLoading(true);
    setSyncStatus(">> INICIANDO SINCRONIZAÇÃO...");
    try {
      await window.electron.sync.syncNow();
      setSyncStatus(">> SINCRONIZAÇÃO CONCLUÍDA!");
      setTimeout(() => {
        setSyncStatus("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus(">> ERRO AO SINCRONIZAR!");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCatalog = async () => {
    setLoading(true);
    setSyncStatus(">> RECARREGANDO PRODUTOS...");
    try {
      await window.electron.sync.loadCatalog();
      setSyncStatus(">> PRODUTOS RECARREGADOS!");
      setTimeout(() => {
        setSyncStatus("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Catalog error:", error);
      setSyncStatus(">> ERRO AO RECARREGAR!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Menu de Utilidades</h2>

        <div className="util-options">
          <div className="menu-item" onClick={!loading ? handleSync : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🔄</span>
              <span>Sincronizar Vendas</span>
            </div>
            <span className="shortcut-badge">1</span>
          </div>

          <div className="menu-item" onClick={!loading ? handleLoadCatalog : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              <span>Recarregar Produtos</span>
            </div>
            <span className="shortcut-badge">2</span>
          </div>

          <div className="menu-item" onClick={() => !loading && alert("Funcionalidade em desenvolvimento")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎫</span>
              <span>Consultar Último Cupom</span>
            </div>
            <span className="shortcut-badge">3</span>
          </div>
        </div>

        <div style={{ marginTop: "24px", minHeight: "24px", textAlign: 'center' }}>
          {syncStatus && (
            <span style={{ color: syncStatus.includes("ERRO") ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
              {syncStatus.replace(">> ", "").replace("!", "")}
            </span>
          )}
        </div>

        <div style={{ marginTop: "24px", display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-logout" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            Fechar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
