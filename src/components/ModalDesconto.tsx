import { useState, useEffect, useRef } from "react";

interface ModalDescontoProps {
  onClose: () => void;
  onConfirm: (value: number) => void;
  maxValue: number;
}

export default function ModalDesconto({ onClose, onConfirm, maxValue }: ModalDescontoProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const formatCurrency = (val: number) => {
    return `R$ ${(val / 100).toFixed(2)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const numericValue = e.target.value.replace(/\D/g, "");
    setValue(numericValue);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const discountValue = parseInt(value || "0");

    if (discountValue > maxValue) {
      setError(`O desconto não pode ser maior que o total (${formatCurrency(maxValue)})`);
      return;
    }

    onConfirm(discountValue);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "350px" }}>
        <h2>Aplicar Desconto</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Digite o valor do desconto em R$
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              ref={inputRef}
              type="text"
              value={value ? (parseInt(value) / 100).toFixed(2) : ""}
              onChange={handleChange}
              placeholder="0.00"
              style={{ textAlign: "center", fontSize: "24px" }}
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
