import { ipcMain } from "electron";
import * as cashService from "../services/cash.service";
import * as printerService from "../services/printer.service";

/**
 * Controller de Caixa
 * Responsabilidade: Gerenciar requisições IPC relacionadas ao caixa
 */

export function registerCaixaHandlers() {
  // Abrir Caixa
  ipcMain.handle("caixa:abrir", async (_, { operatorId, operatorName, initialAmount }) => {
    try {
      const session = await cashService.openSession(operatorId, operatorName, initialAmount);
      
      // Imprimir comprovante
      const receiptHtml = printerService.generateOpeningReceipt({
        pdvId: "PDV-01", // TODO: Pegar do config
        operatorName,
        openedAt: session.openedAt,
        initialAmount,
      });
      
      // await printerService.printReceipt(receiptHtml);
      
      return { success: true, session, receiptHtml };
    } catch (error: any) {
      console.error("[Caixa Controller] Error opening session:", error);
      return { success: false, error: error.message };
    }
  });

  // Fechar Caixa
  ipcMain.handle("caixa:fechar", async (_, { sessionId, finalAmount }) => {
    try {
      const result = await cashService.closeSession(sessionId, finalAmount);
      
      // Gerar Relatório Z
      const zReportHtml = printerService.generateZReport({
        pdvId: "PDV-01",
        operatorName: result.session.operatorName,
        openedAt: result.session.openedAt,
        closedAt: result.session.closedAt!,
        initialAmount: result.session.initialAmount,
        finalAmount: result.session.finalAmount!,
        salesTotal: result.totals.salesTotal,
        salesCount: result.totals.salesCount,
        bleedsTotal: result.totals.bleedsTotal,
        suppliesTotal: result.totals.suppliesTotal,
        netTotal: result.totals.netTotal,
        paymentMethods: result.totals.paymentMethods,
        operatorSales: result.totals.operatorSales,
        detailedMovements: result.totals.detailedMovements,
        title: "FECHAMENTO DE CAIXA"
      });
      
      // await printerService.printReceipt(zReportHtml);
      
      return { success: true, result, zReportHtml };
    } catch (error: any) {
      console.error("[Caixa Controller] Error closing session:", error);
      return { success: false, error: error.message };
    }
  });

  // Sangria
  ipcMain.handle("caixa:sangria", async (_, { sessionId, amount, reason, operatorName, operatorId }) => {
    try {
      const movement = await cashService.createMovement({
        type: "SANGRIA",
        amount,
        reason,
        sessionId,
        operatorId,
      });
      
      // Imprimir comprovante
      const receiptHtml = printerService.generateMovementReceipt({
        pdvId: "PDV-01",
        type: "SANGRIA",
        amount,
        reason,
        operatorName,
        date: movement.createdAt,
      });
      
      // await printerService.printReceipt(receiptHtml);
      
      return { success: true, movement, receiptHtml };
    } catch (error: any) {
      console.error("[Caixa Controller] Error creating bleed:", error);
      return { success: false, error: error.message };
    }
  });

  // Suprimento
  ipcMain.handle("caixa:suprimento", async (_, { sessionId, amount, reason, operatorName, operatorId }) => {
    try {
      const movement = await cashService.createMovement({
        type: "REFORCO",
        amount,
        reason,
        sessionId,
        operatorId,
      });
      
      // Imprimir comprovante
      const receiptHtml = printerService.generateMovementReceipt({
        pdvId: "PDV-01",
        type: "SUPRIMENTO",
        amount,
        reason,
        operatorName,
        date: movement.createdAt,
      });
      
      // await printerService.printReceipt(receiptHtml);
      
      return { success: true, movement, receiptHtml };
    } catch (error: any) {
      console.error("[Caixa Controller] Error creating supply:", error);
      return { success: false, error: error.message };
    }
  });

  // Verificar Status
  ipcMain.handle("caixa:status", async (_, { operatorId }) => {
    try {
      const session = await cashService.getCurrentSession(operatorId);
      return { isOpen: !!session, session };
    } catch (error: any) {
      console.error("[Caixa Controller] Error checking status:", error);
      return { isOpen: false, error: error.message };
    }
  });

  // Obter Totais (Prévia do Z)
  ipcMain.handle("caixa:totals", async (_, { sessionId }) => {
    try {
      const totals = await cashService.calculateSessionTotals(sessionId);
      return { success: true, totals };
    } catch (error: any) {
      console.error("[Caixa Controller] Error getting totals:", error);
      return { success: false, error: error.message };
    }
  });

  // Obter Totais do Dia (Redução Z)
  ipcMain.handle("caixa:daily-totals", async () => {
    try {
      const today = new Date();
      const totals = await cashService.getDailyTotals(today);
      
      const zReportHtml = printerService.generateZReport({
        pdvId: "PDV-01",
        operatorName: "TODOS",
        openedAt: totals.date,
        closedAt: new Date(),
        initialAmount: 0, // Não aplicável para visão diária agregada
        finalAmount: totals.netTotal, // Assumindo que tudo foi conferido
        salesTotal: totals.salesTotal,
        salesCount: totals.salesCount,
        bleedsTotal: totals.bleedsTotal,
        suppliesTotal: totals.suppliesTotal,
        netTotal: totals.netTotal,
        paymentMethods: totals.paymentMethods,
        operatorSales: totals.operatorSales,
        detailedMovements: totals.detailedMovements,
        fiscal: totals.fiscal,
        title: "REDUÇÃO Z"
      });
      
      return { success: true, zReportHtml };
    } catch (error: any) {
      console.error("[Caixa Controller] Error getting daily totals:", error);
      return { success: false, error: error.message };
    }
  });
}
