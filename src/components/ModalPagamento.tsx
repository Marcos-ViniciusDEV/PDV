import { useState, useEffect, useRef, useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { useVendaStore } from "../stores/vendaStore";

interface ModalPagamentoProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Payment {
  method: string;
  amount: number;
}

const PAYMENT_METHODS = [
  { id: "DINHEIRO", label: "Dinheiro", icon: "💵" },
  { id: "DEBITO", label: "Débito", icon: "💳" },
  { id: "CREDITO", label: "Crédito", icon: "💳" },
  { id: "PIX", label: "PIX", icon: "📱" },
];

export default function ModalPagamento({ onClose, onSuccess }: ModalPagamentoProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const methodRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const user = useAuthStore((state) => state.user);
  const { items, getNetTotal, getDiscount, getTotal, clear } = useVendaStore();

  const total = getNetTotal();
  const discount = getDiscount();
  const subtotal = getTotal();

  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  // Initialize amount input with remaining value when not focused
  useEffect(() => {
    if (!isInputFocused && remaining > 0) {
      setAmountInput((remaining / 100).toFixed(2));
    }
  }, [remaining, isInputFocused]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (isInputFocused) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddPayment();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          // Prevent changing method while typing amount, or maybe allow?
          // Better to require leaving input to change method
          e.preventDefault();
          inputRef.current?.blur();
          setIsInputFocused(false);
        }
        return;
      }

      // Navigation when input is NOT focused
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMethodIndex((prev) => (prev + 1) % PAYMENT_METHODS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMethodIndex((prev) => (prev - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (remaining <= 0 && payments.length > 0) {
          handleFinalize();
        } else {
          // Focus input to add payment
          setIsInputFocused(true);
          setTimeout(() => inputRef.current?.select(), 10);
        }
      } else if (e.key === "F12") {
        e.preventDefault();
        if (remaining <= 0) handleFinalize();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, isInputFocused, selectedMethodIndex, amountInput, remaining, payments]);

  // Focus management
  useEffect(() => {
    if (isInputFocused) {
      inputRef.current?.focus();
    } else {
      methodRefs.current[selectedMethodIndex]?.focus();
    }
  }, [isInputFocused, selectedMethodIndex]);

  const handleAddPayment = () => {
    const amount = Math.round(parseFloat(amountInput.replace(",", ".")) * 100);
    
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido");
      return;
    }

    const method = PAYMENT_METHODS[selectedMethodIndex].id;
    
    // Allow overpayment only for CASH
    if (method !== "DINHEIRO" && amount > remaining) {
      alert("Valor não pode ser maior que o restante para este método");
      return;
    }

    setPayments([...payments, { method, amount }]);
    setAmountInput("");
    setIsInputFocused(false);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    if (remaining > 0) {
      alert("Ainda há valor pendente a pagar");
      return;
    }

    setLoading(true);

    try {
      const orderNumber = `PDV001-${Date.now()}`;

      const result = await window.electron.db.saveOrder({
        orderNumber,
        total: subtotal,
        discount: discount,
        netTotal: total,
        paymentMethod: payments[0].method, // Legacy field
        payments: payments, // New field
        operatorId: user?.id,
        operatorName: user?.name,
        pdvId: "PDV001",
        couponType: "NFC-e",
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
          discount: 0,
        })),
      });

      // Registrar movimentos de caixa para pagamentos em dinheiro
      const cashTotal = payments
        .filter(p => p.method === "DINHEIRO")
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Se houve troco, o valor real que entrou no caixa é (Total em Dinheiro - Troco)
      // Mas contabilmente registramos a venda. O troco sai do caixa?
      // Simplificação: Registra o valor LIQUIDO em dinheiro que ficou no caixa.
      // Ou registra Entrada de X e Saída de Troco Y?
      // Vamos registrar Entrada do valor exato que cobre a parte em dinheiro.
      // Se pagou 100 em dinheiro para conta de 90, entrou 90.
      // Se pagou 50 em dinheiro e 40 em cartão para conta de 90, entrou 50.
      // O troco é devolvido na hora.
      
      const cashEntry = Math.max(0, cashTotal - change);

      if (cashEntry > 0) {
        await window.electron.db.saveCashMovement({
          type: "VENDA",
          amount: cashEntry,
          operatorId: user?.id,
          reason: `Venda ${result.numeroVenda}`
        });
      }

      clear();
      await window.electron.sync.syncNow();

      // Print Coupon
      printCoupon(result, payments, change);

      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2)}`;
  };

  const printCoupon = (sale: any, payments: Payment[], change: number) => {
    // ... (Reuse existing print logic but adapted for multiple payments)
    const width = 400;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const printWindow = window.open("", "_blank", `width=${width},height=${height},top=${top},left=${left}`);

    if (printWindow) {
      const html = `
        <html>
          <head>
            <title>Cupom Fiscal</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; }
              td { vertical-align: top; padding: 2px 0; }
            </style>
          </head>
          <body>
            <div class="text-center bold">MERCADO EXEMPLO LTDA</div>
            <div class="text-center">CNPJ: 12.345.678/0001-90</div>
            
            <div class="divider"></div>
            
            <div class="text-center bold">CUPOM FISCAL ELETRÔNICO</div>
            <div class="text-center">CCF: ${sale.ccf} COO: ${sale.coo}</div>
            
            <div class="divider"></div>
            
            <table>
              ${items.map((item, index) => `
                <tr>
                  <td colspan="4">${(index + 1).toString().padStart(3, "0")} ${item.id} ${item.name}</td>
                </tr>
                <tr>
                  <td>${item.quantity} UN</td>
                  <td class="text-right">${(item.price / 100).toFixed(2)}</td>
                  <td class="text-right">${(item.price * item.quantity / 100).toFixed(2)}</td>
                </tr>
              `).join("")}
            </table>
            
            <div class="divider"></div>
            
            <div class="text-right">SUBTOTAL R$ ${(subtotal / 100).toFixed(2)}</div>
            ${discount > 0 ? `<div class="text-right">DESCONTO R$ -${(discount / 100).toFixed(2)}</div>` : ''}
            <div class="text-right bold">TOTAL R$ ${(total / 100).toFixed(2)}</div>
            
            <div class="divider"></div>
            
            ${payments.map(p => `
              <div class="text-right">
                ${p.method} R$ ${(p.amount / 100).toFixed(2)}
              </div>
            `).join("")}
            
            <div class="text-right">TROCO R$ ${(change / 100).toFixed(2)}</div>
            
            <div class="divider"></div>
            <div class="text-center">OBRIGADO PELA PREFERÊNCIA!</div>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', display: 'flex', gap: '20px' }}>
        
        {/* Left Side: Payment Selection */}
        <div style={{ flex: 1 }}>
          <h2>Finalizar Venda</h2>
          
          <div className="info-card" style={{ marginBottom: '20px', background: 'var(--bg-secondary)', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--error)' }}>
                <span>Desconto</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PAYMENT_METHODS.map((method, index) => (
              <button
                key={method.id}
                ref={el => methodRefs.current[index] = el}
                className={`action-btn ${selectedMethodIndex === index ? 'primary' : ''}`}
                onClick={() => {
                  setSelectedMethodIndex(index);
                  setIsInputFocused(true);
                }}
                style={{ 
                  justifyContent: 'flex-start', 
                  padding: '15px',
                  border: selectedMethodIndex === index ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontSize: '24px', marginRight: '10px' }}>{method.icon}</span>
                <span style={{ fontSize: '18px' }}>{method.label}</span>
                {selectedMethodIndex === index && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px' }}>⏎ Selecionar</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Input & Summary */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              Valor a Pagar ({PAYMENT_METHODS[selectedMethodIndex].label})
            </label>
            <input
              ref={inputRef}
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="0,00"
              style={{ 
                width: '100%', 
                fontSize: '32px', 
                padding: '10px', 
                textAlign: 'right',
                border: isInputFocused ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: '4px'
              }}
            />
            <div style={{ textAlign: 'right', marginTop: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Pressione ENTER para adicionar
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Pagamentos Adicionados</h3>
            {payments.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum pagamento adicionado</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <span>{PAYMENT_METHODS.find(m => m.id === p.method)?.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>{formatCurrency(p.amount)}</span>
                      <button 
                        onClick={() => handleRemovePayment(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '18px' }}>
              <span>Total Pago:</span>
              <span style={{ color: 'var(--success)' }}>{formatCurrency(totalPaid)}</span>
            </div>
            {remaining > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                <span>Restante:</span>
                <span style={{ color: 'var(--error)' }}>{formatCurrency(remaining)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                <span>Troco:</span>
                <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(change)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} className="btn-logout" style={{ flex: 1 }}>
                Cancelar (ESC)
              </button>
              <button 
                onClick={handleFinalize} 
                disabled={remaining > 0 || loading} 
                className="btn-primary" 
                style={{ flex: 2, opacity: remaining > 0 ? 0.5 : 1 }}
              >
                {loading ? "Processando..." : "Finalizar (F12/Enter)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
