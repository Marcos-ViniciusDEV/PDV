import { useEffect, useRef } from "react";

interface ModalOpcoesDescontoProps {
  onClose: () => void;
  onGiveDiscount: () => void;
  onRemoveDiscount: () => void;
  hasDiscount: boolean;
}

export default function ModalOpcoesDesconto({ 
  onClose, 
  onGiveDiscount, 
  onRemoveDiscount,
  hasDiscount 
}: ModalOpcoesDescontoProps) {
  const giveDiscountRef = useRef<HTMLButtonElement>(null);
  const removeDiscountRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (giveDiscountRef.current) {
      giveDiscountRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    const buttons = [giveDiscountRef.current, removeDiscountRef.current, cancelRef.current]
      .filter((btn): btn is HTMLButtonElement => !!btn && !btn.disabled);
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % buttons.length;
      buttons[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      buttons[prevIndex]?.focus();
    }
  };

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown}>
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        <h2>Gerenciar Desconto</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Selecione uma opção (Use as setas para navegar)
        </p>

        <div className="modal-actions" style={{ flexDirection: "column", gap: "10px" }}>
          <button 
            ref={giveDiscountRef}
            onClick={onGiveDiscount} 
            className="btn-primary" 
            style={{ width: "100%", padding: "12px" }}
          >
            Aplicar Desconto (F9)
          </button>
          
          <button 
            ref={removeDiscountRef}
            onClick={onRemoveDiscount} 
            className="btn-logout" 
            style={{ width: "100%", padding: "12px", opacity: hasDiscount ? 1 : 0.5, cursor: hasDiscount ? "pointer" : "not-allowed" }}
            disabled={!hasDiscount}
          >
            Remover Desconto
          </button>

          <button 
            ref={cancelRef}
            onClick={onClose} 
            className="btn-secondary" 
            style={{ width: "100%", padding: "12px", marginTop: "10px" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
