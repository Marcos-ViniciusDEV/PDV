import { useState, useEffect, useRef } from "react";

interface ModalAutorizacaoProps {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function ModalAutorizacao({ 
  onClose, 
  onSuccess, 
  title = "Autorização Supervisor",
  description = "Digite a senha para autorizar a ação"
}: ModalAutorizacaoProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "123456") {
      onSuccess();
      onClose();
    } else {
      setError("Senha incorreta");
      setPassword("");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "350px" }}>
        <h2>{title}</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px" }}>
          {description}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Senha (6 dígitos)"
              maxLength={6}
              style={{ textAlign: "center", letterSpacing: "4px", fontSize: "24px" }}
            />
          </div>

          {error && (
            <div style={{ color: "var(--danger)", textAlign: "center", marginBottom: "15px", fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-logout" style={{ flex: 1, justifyContent: "center" }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
