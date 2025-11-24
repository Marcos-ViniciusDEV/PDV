import { useState, useEffect, useRef } from "react";

interface ModalRemoverItemProps {
  onClose: () => void;
  onConfirm: (index: number) => void;
  maxItems: number;
}

export default function ModalRemoverItem({ onClose, onConfirm, maxItems }: ModalRemoverItemProps) {
  const [itemIndex, setItemIndex] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const index = parseInt(itemIndex);

    if (isNaN(index) || index < 1 || index > maxItems) {
      setError(`Item inválido. Digite um número entre 1 e ${maxItems}`);
      setItemIndex("");
      return;
    }

    onConfirm(index - 1); // Convert to 0-based index
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "350px" }}>
        <h2>Remover Item</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Digite o número do item a ser removido
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              ref={inputRef}
              type="number"
              value={itemIndex}
              onChange={(e) => {
                setItemIndex(e.target.value);
                setError("");
              }}
              placeholder="Nº do Item"
              min={1}
              max={maxItems}
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
              Remover
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
