import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useVendaStore } from "../stores/vendaStore";

interface ModalPagamentoProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalPagamento({ onClose, onSuccess }: ModalPagamentoProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { items, getNetTotal, getDiscount, getTotal, clear } = useVendaStore();

  const total = getNetTotal();
  const discount = getDiscount();
  const subtotal = getTotal();

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Selecione uma forma de pagamento");
      return;
    }

    if (paymentMethod === "DINHEIRO" && (!paidAmount || parseFloat(paidAmount) < total / 100)) {
      alert("Valor pago insuficiente");
      return;
    }

    setLoading(true);

    try {
      // Gerar número da venda
      const orderNumber = `PDV001-${Date.now()}`;

      // Salvar venda
      const result = await window.electron.db.saveOrder({
        orderNumber,
        total: subtotal, // Save gross total
        discount: discount, // Save discount
        netTotal: total,
        paymentMethod,
        operatorId: user?.id,
        operatorName: user?.name,
        pdvId: "PDV001", // TODO: Get from config
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

      // Se pagamento em dinheiro, registrar movimento de caixa
      if (paymentMethod === "DINHEIRO") {
        await window.electron.db.saveCashMovement({
          type: "VENDA",
          amount: total,
          operatorId: user?.id,
        });
      }

      // Limpar carrinho
      clear();

      // Tentar sincronizar
      await window.electron.sync.syncNow();

      console.log("Venda salva:", result);

      const changeValue = calculateChange();
      const finalPaidAmount = paidAmount ? parseFloat(paidAmount) : total / 100;

      // Simular impressão do cupom
      const couponData = {
        company: {
          name: "MERCADO EXEMPLO LTDA",
          cnpj: "12.345.678/0001-90",
          address: "AV. BRASIL, 1000 - CENTRO",
        },
        sale: {
          ccf: result.ccf || "000000",
          coo: result.coo || "000000",
          date: new Date().toLocaleString("pt-BR"),
          items: items.map(item => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity
          })),
          subtotal: subtotal,
          discount: discount,
          total: total,
          paymentMethod: paymentMethod,
          paidAmount: finalPaidAmount,
          change: changeValue,
          pdvId: "PDV001", // Hardcoded for now as per saveOrder
          operatorName: user?.name || "Não identificado",
        },
      };

      printCoupon(couponData);

      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = () => {
    if (!paidAmount) return 0;
    // Arredondar para evitar erros de ponto flutuante (ex: 4.67 * 100 = 466.999...)
    const paid = Math.round(parseFloat(paidAmount) * 100);
    if (isNaN(paid)) return 0;
    return Math.max(0, paid - total);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2)}`;
  };

  const printCoupon = (data: any) => {
    const width = 400;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const printWindow = window.open("", "_blank", `width=${width},height=${height},top=${top},left=${left}`);

    if (printWindow) {
      const html = `
        <html>
          <head>
            <title>Cupom Fiscal</title>
            <style>
              @page { margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                font-size: 12px; 
                margin: 0; 
                padding: 10px; 
                width: 100%;
                max-width: 300px;
                color: #000;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .bold { font-weight: bold; }
              .divider { 
                border-top: 1px dashed #000; 
                margin: 5px 0; 
                width: 100%;
              }
              .item-row { margin-bottom: 2px; }
              .item-header { display: flex; justify-content: space-between; }
              .item-details { display: flex; justify-content: space-between; }
              
              /* Table-like structure using flexbox for better control in narrow width */
              .col-qtd { width: 30px; }
              .col-un { width: 30px; }
              .col-price { width: 70px; text-align: right; }
              .col-total { width: 70px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="text-center bold">${data.company.name}</div>
            <div class="text-center">CNPJ: ${data.company.cnpj}</div>
            <div class="text-center">${data.company.address}</div>
            
            <div class="divider"></div>
            
            <div class="text-center bold">CUPOM FISCAL ELETRÔNICO</div>
            <div class="text-center">CCF: ${data.sale.ccf} COO: ${data.sale.coo}</div>
            <div class="text-center">PDV: ${data.sale.pdvId}</div>
            
            <div class="divider"></div>
            
            <div class="text-center">CONSUMIDOR NÃO IDENTIFICADO</div>
            
            <div class="divider"></div>
            
            <div class="bold" style="margin-bottom: 2px;">ITEM CÓDIGO DESCRIÇÃO</div>
            <div class="bold" style="display: flex; justify-content: space-between;">
              <span class="col-qtd">QTD</span>
              <span class="col-un">UN</span>
              <span class="col-price">VL UNIT</span>
              <span class="col-total">VL TOTAL</span>
            </div>
            
            <div class="divider"></div>
            
            ${data.sale.items.map((item: any, index: number) => `
              <div class="item-row">
                <div class="text-left">
                  ${(index + 1).toString().padStart(3, "0")} ${item.productId} ${item.productName}
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span class="col-qtd">${item.quantity}</span>
                  <span class="col-un">UN</span>
                  <span class="col-price">${(item.unitPrice / 100).toFixed(2)}</span>
                  <span class="col-total">${(item.total / 100).toFixed(2)}</span>
                </div>
              </div>
            `).join("")}
            
            <div class="divider"></div>
            
            <div class="text-right bold" style="font-size: 14px; margin: 5px 0;">
              TOTAL R$ ${(data.sale.total / 100).toFixed(2)}
            </div>
            
            ${data.sale.discount > 0 ? `
              <div class="text-right">Desconto R$ -${(data.sale.discount / 100).toFixed(2)}</div>
            ` : ''}
            
            <div class="text-right">
              ${data.sale.paymentMethod} R$ ${(data.sale.paidAmount || data.sale.total / 100).toFixed(2)}
            </div>
            
            <div class="text-right">
              TROCO R$ ${((data.sale.change || 0) / 100).toFixed(2)}
            </div>
            
            <div class="divider"></div>
            
            <div class="text-center">${data.sale.date}</div>
            <div class="text-center">Operador: ${data.sale.operatorName}</div>
            
            <div class="text-center" style="margin-top: 15px;">OBRIGADO PELA PREFERÊNCIA!</div>
            <div class="text-center" style="font-size: 10px; margin-top: 5px;">Sistema PDV - Versão 1.0</div>
            
            <script>
              // window.print();
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Finalizar Venda</h2>

        <div className="info-card" style={{ marginBottom: '24px', textAlign: 'center', background: 'var(--bg-secondary)', border: 'none' }}>
          <span className="label" style={{ marginBottom: '4px' }}>Total a Pagar</span>
          <span className="value total" style={{ fontSize: '36px' }}>{formatCurrency(total)}</span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>Forma de Pagamento</label>
          <div className="payment-methods" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              className={`action-btn ${paymentMethod === "DINHEIRO" ? "primary" : ""}`} 
              onClick={() => setPaymentMethod("DINHEIRO")}
              style={{ padding: '12px', alignItems: 'center' }}
            >
              <span style={{ fontSize: '20px' }}>💵</span>
              <span>Dinheiro</span>
            </button>
            <button 
              className={`action-btn ${paymentMethod === "DEBITO" ? "primary" : ""}`} 
              onClick={() => setPaymentMethod("DEBITO")}
              style={{ padding: '12px', alignItems: 'center' }}
            >
              <span style={{ fontSize: '20px' }}>💳</span>
              <span>Débito</span>
            </button>
            <button 
              className={`action-btn ${paymentMethod === "CREDITO" ? "primary" : ""}`} 
              onClick={() => setPaymentMethod("CREDITO")}
              style={{ padding: '12px', alignItems: 'center' }}
            >
              <span style={{ fontSize: '20px' }}>💳</span>
              <span>Crédito</span>
            </button>
            <button 
              className={`action-btn ${paymentMethod === "PIX" ? "primary" : ""}`} 
              onClick={() => setPaymentMethod("PIX")}
              style={{ padding: '12px', alignItems: 'center' }}
            >
              <span style={{ fontSize: '20px' }}>📱</span>
              <span>PIX</span>
            </button>
          </div>
        </div>

        {paymentMethod === "DINHEIRO" && (
          <div className="cash-payment" style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--border-radius)' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Valor Recebido</label>
              <input 
                type="number" 
                step="0.01" 
                value={paidAmount} 
                onChange={(e) => setPaidAmount(e.target.value)} 
                placeholder="0,00" 
                autoFocus 
                style={{ fontSize: '24px', fontWeight: 600, textAlign: 'center', letterSpacing: '2px', color: 'var(--accent-primary)' }}
              />
            </div>
            {paidAmount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Troco:</span>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(calculateChange())}</span>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onClose} disabled={loading} className="btn-logout" style={{ flex: 1, justifyContent: 'center' }}>
            Cancelar
          </button>
          <button onClick={handlePayment} disabled={loading} className="btn-primary" style={{ flex: 2 }}>
            {loading ? "Processando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
