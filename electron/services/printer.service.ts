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
    * { box-sizing: border-box; }
    @page { margin: 0; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      margin: 0; 
      padding: 10px; 
      width: 100%;
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
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 2px 0; }
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
        <div class="text-left">Data: ${data.openedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
        
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
  pdvId: string;
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
        <div class="text-center">PDV: ${data.pdvId}</div>
        
        <div class="divider"></div>
        
        <div class="text-left">Operador: ${data.operatorName}</div>
        <div class="text-left">Data: ${data.date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
        
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
  operatorSales: Record<string, { 
    name: string;
    totalSales: number;
    totalDiscount: number;
    totalBleeds: number;
    totalSupplies: number;
    paymentMethods: Record<string, number>;
  }>;
  detailedMovements: Array<{ type: string; amount: number; reason: string; time: Date }>;
  fiscal?: {
    crz: number;
    cro: number;
    gt: number;
    cooInitial: number;
    cooFinal: number;
    grossTotal: number;
    discountTotal: number;
    cancelledCount: number;
    cancelledTotal: number;
    weeklyTotal: number;
    monthlyTotals: Record<string, number>;
  };
  title?: string;
}) {
  const diff = data.finalAmount - data.netTotal;
  const fiscal = data.fiscal || {
    crz: 0, cro: 0, gt: 0, cooInitial: 0, cooFinal: 0, 
    grossTotal: data.salesTotal, discountTotal: 0, cancelledCount: 0, cancelledTotal: 0,
    weeklyTotal: 0, monthlyTotals: {}
  };
  
  const reportTitle = data.title || "REDUÇÃO Z";

  const paymentRows = Object.entries(data.paymentMethods)
    .map(([method, amount]) => `
      <div style="display: flex; justify-content: space-between;">
        <span>${method}</span>
        <span>R$ ${(amount / 100).toFixed(2)}</span>
      </div>
    `)
    .join("");

  const operatorRows = Object.values(data.operatorSales)
    .map((stats) => `
      <div style="margin-top: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
        <div class="bold" style="text-transform: uppercase;">${stats.name}</div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>(+) Venda Bruta:</span>
          <span>R$ ${((stats.totalSales + stats.totalDiscount) / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(-) Descontos:</span>
          <span>R$ ${(stats.totalDiscount / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>(=) Venda Líquida:</span>
          <span>R$ ${(stats.totalSales / 100).toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 2px;">
          ${Object.entries(stats.paymentMethods).map(([method, amount]) => `
            <div style="display: flex; justify-content: space-between; padding-left: 10px; font-size: 11px;">
              <span>${method}:</span>
              <span>R$ ${(amount / 100).toFixed(2)}</span>
            </div>
          `).join("")}
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>(-) Sangrias:</span>
          <span>R$ ${(stats.totalBleeds / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(+) Suprimentos:</span>
          <span>R$ ${(stats.totalSupplies / 100).toFixed(2)}</span>
        </div>
      </div>
    `)
    .join("");

  return `
    <html>
      <head>${COMMON_STYLE}</head>
      <body>
        <div class="text-center bold">MINHA EMPRESA LTDA</div>
        <div class="text-center">CNPJ: 12.345.678/0001-99 IE: 123.456.789.000</div>
        <div class="text-center">RUA EXEMPLO, 123 - CENTRO - CIDADE/UF</div>
        
        <div class="divider"></div>
        
        <div class="text-center bold">${reportTitle}</div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>MOVIMENTO DO DIA:</span>
          <span>${data.openedAt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>IMPRESSÃO:</span>
          <span>${new Date().toLocaleString('pt-BR')}</span>
        </div>
        
        <div class="divider"></div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>COO Inicial: ${fiscal.cooInitial.toString().padStart(6, '0')}</span>
          <span>COO Final: ${fiscal.cooFinal.toString().padStart(6, '0')}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>CRZ: ${fiscal.crz.toString().padStart(6, '0')}</span>
          <span>CRO: ${fiscal.cro.toString().padStart(6, '0')}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>GNFC (Cancelamentos):</span>
          <span>${fiscal.cancelledCount.toString().padStart(6, '0')}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center bold">TOTALIZADORES GERAIS</div>
        
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>VENDA BRUTA DIÁRIA:</span>
          <span>R$ ${(fiscal.grossTotal / 100).toFixed(2)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>(-) CANCELAMENTO ICMS:</span>
          <span>R$ ${(fiscal.cancelledTotal / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>(-) DESCONTO ICMS:</span>
          <span>R$ ${(fiscal.discountTotal / 100).toFixed(2)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;" class="bold">
          <span>VENDA LÍQUIDA:</span>
          <span>R$ ${(data.netTotal / 100).toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center bold">TOTALIZADORES PARCIAIS</div>
        <!-- Mock de Impostos -->
        <div style="display: flex; justify-content: space-between;">
          <span>01T18,00%</span>
          <span>R$ ${(data.netTotal / 100).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>F - Isento</span>
          <span>R$ 0,00</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>N - Não Tributado</span>
          <span>R$ 0,00</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center bold">MEIOS DE PAGAMENTO</div>
        ${paymentRows}
        
        <div class="divider"></div>

        <div class="text-center bold">DETALHAMENTO POR OPERADOR</div>
        ${operatorRows}

        <div class="divider"></div>

        <div class="text-center bold">VENDA SEMANAL</div>
        <div style="display: flex; justify-content: space-between;">
          <span>Semana Atual:</span>
          <span>R$ ${(fiscal.weeklyTotal / 100).toFixed(2)}</span>
        </div>

        <div class="divider"></div>

        <div class="text-center bold">VENDA MENSAL</div>
        ${Object.entries(fiscal.monthlyTotals).map(([month, total]) => `
          <div style="display: flex; justify-content: space-between;">
            <span>${month}:</span>
            <span>R$ ${(total / 100).toFixed(2)}</span>
          </div>
        `).join("")}
        
        <div class="divider"></div>


        

        
        <div class="text-center">FAB: BE091210100011223344</div>
        <div class="text-center">MOD: ECF-IF VERSÃO: 01.00.00</div>
        <div class="text-center">ECF: 001 LJ: 001</div>
        <div class="text-center bold">BR</div>
        <div class="text-center">ABCDE-12345-FGHIJ-67890-KLMNO</div>
        
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
