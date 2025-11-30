import { BrowserWindow } from "electron";

/**
 * Service de Impressão
 * Responsabilidade: Gerar layouts e enviar para impressão
 */

interface PrintOptions {
  silent?: boolean;
  deviceName?: string;
}

export async function printReceipt(htmlContent: string, options: PrintOptions = {}) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);

  const printOptions = {
    silent: options.silent || false,
    deviceName: options.deviceName,
  };

  return new Promise((resolve, reject) => {
    win.webContents.print(printOptions, (success, errorType) => {
      if (!success) {
        console.error(`[Printer Service] Failed to print: ${errorType}`);
        reject(new Error(errorType));
      } else {
        console.log("[Printer Service] Print success");
        resolve(true);
      }
      win.close();
    });
  });
}

const COMMON_STYLE = `
  <style>
    @page { margin: 0; }
    body { 
      font-family: 'Courier New', Courier, monospace; 
      font-size: 12px; 
      margin: 0; 
      padding: 10px; 
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
    .signature-box {
      margin-top: 40px;
      border-top: 1px solid #000;
      text-align: center;
      padding-top: 5px;
    }
  </style>
`;

export function generateOpeningReceipt(data: {
  pdvId: string;
  operatorName: string;
  openedAt: Date;
  initialAmount: number;
}) {
  return `
    <html>
      <head>${COMMON_STYLE}</head>
      <body>
        <div class="text-center bold">ABERTURA DE CAIXA</div>
        <div class="text-center">PDV: ${data.pdvId}</div>
        
        <div class="divider"></div>
        
        <div class="text-left">Operador: ${data.operatorName}</div>
        <div class="text-left">Data: ${data.openedAt.toLocaleString()}</div>
        
        <div class="divider"></div>
        
        <div class="text-right bold" style="font-size: 14px;">
          FUNDO DE TROCO: R$ ${(data.initialAmount / 100).toFixed(2)}
        </div>
        
        <div class="signature-box">
          Assinatura Operador
        </div>
        
        <div class="signature-box">
          Assinatura Supervisor
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Imprimir</button>
        </div>

        <style>
          @media print {
            .no-print { display: none; }
          }
        </style>
      </body>
    </html>
  `;
}

export function generateMovementReceipt(data: {
  type: string;
  amount: number;
  reason: string;
  operatorName: string;
  date: Date;
}) {
  return `
    <html>
      <head>${COMMON_STYLE}</head>
      <body>
        <div class="text-center bold">COMPROVANTE DE ${data.type}</div>
        
        <div class="divider"></div>
        
        <div class="text-left">Operador: ${data.operatorName}</div>
        <div class="text-left">Data: ${data.date.toLocaleString()}</div>
        
        <div class="divider"></div>
        
        <div class="text-left">Motivo:</div>
        <div class="text-left">${data.reason}</div>
        
        <div class="divider"></div>
        
        <div class="text-right bold" style="font-size: 14px;">
          VALOR: R$ ${(data.amount / 100).toFixed(2)}
        </div>
        
        <div class="signature-box">
          Assinatura Operador
        </div>
        
        <div class="signature-box">
          Assinatura Supervisor
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Imprimir</button>
        </div>

        <style>
          @media print {
            .no-print { display: none; }
          }
        </style>
      </body>
    </html>
  `;
}

export function generateZReport(data: {
  pdvId: string;
  operatorName: string;
  openedAt: Date;
  closedAt: Date;
  initialAmount: number;
  finalAmount: number; // Valor em gaveta
  salesTotal: number;
  salesCount: number;
  bleedsTotal: number;
  suppliesTotal: number;
  netTotal: number; // Calculado pelo sistema
  paymentMethods: Record<string, number>;
}) {
  const diff = data.finalAmount - data.netTotal;
  
  const paymentRows = Object.entries(data.paymentMethods)
    .map(([method, amount]) => `
      <div style="display: flex; justify-content: space-between;">
        <span>${method}</span>
        <span>R$ ${(amount / 100).toFixed(2)}</span>
      </div>
    `)
    .join("");

  return `
    <html>
      <head>${COMMON_STYLE}</head>
      <body>
        <div class="text-center bold">RELATÓRIO Z (FECHAMENTO)</div>
        <div class="text-center">PDV: ${data.pdvId}</div>
        
        <div class="divider"></div>
        
        <div class="text-left">Operador: ${data.operatorName}</div>
        <div class="text-left">Abertura: ${data.openedAt.toLocaleString()}</div>
        <div class="text-left">Fechamento: ${data.closedAt.toLocaleString()}</div>
        
        <div class="divider"></div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>Fundo de Troco:</span>
          <span>R$ ${(data.initialAmount / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Vendas (${data.salesCount}):</span>
          <span>R$ ${(data.salesTotal / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Sangrias:</span>
          <span>R$ ${(data.bleedsTotal / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Suprimentos:</span>
          <span>R$ ${(data.suppliesTotal / 100).toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>SALDO ESPERADO:</span>
          <span>R$ ${(data.netTotal / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>VALOR EM GAVETA:</span>
          <span>R$ ${(data.finalAmount / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Diferença:</span>
          <span>R$ ${(diff / 100).toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center bold" style="margin-bottom: 5px;">TOTAIS POR PAGAMENTO</div>
        ${paymentRows}
        
        <div class="signature-box">
          Assinatura Operador
        </div>
        
        <div class="signature-box">
          Assinatura Supervisor
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Imprimir</button>
        </div>

        <style>
          @media print {
            .no-print { display: none; }
          }
        </style>
      </body>
    </html>
  `;
}
