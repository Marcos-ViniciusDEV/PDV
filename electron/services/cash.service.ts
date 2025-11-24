import { v4 as uuidv4 } from "uuid";
import * as cashRepository from "../repositories/cash.repository";
import type { InsertCashMovement } from "../db/schema";

/**
 * Service de caixa
 * Responsabilidade: Lógica de negócio de caixa (Single Responsibility)
 * Depende de: cash.repository (Dependency Inversion)
 */

type MovementType = "ABERTURA" | "FECHAMENTO" | "SANGRIA" | "REFORCO";

/**
 * Cria uma movimentação de caixa
 */
export async function createMovement(
  type: MovementType,
  amount: number,
  operatorId: number,
  reason?: string
) {
  console.log(`[Cash Service] Creating ${type} movement: ${amount}`);
  
  const uuid = uuidv4();
  
  const movement: InsertCashMovement = {
    uuid,
    type,
    amount,
    operatorId,
    reason: reason || null,
    syncStatus: "pending",
  };
  
  const created = await cashRepository.createMovement(movement);
  
  console.log(`[Cash Service] ✅ Movement created: ${created.uuid}`);
  
  return {
    uuid: created.uuid,
    type: created.type,
    amount: created.amount,
  };
}

/**
 * Busca saldo do caixa
 */
export async function getCashBalance() {
  return cashRepository.getCashBalance();
}

/**
 * Busca movimentações pendentes de sincronização
 */
export async function getPendingMovements() {
  return cashRepository.getPendingMovements();
}

/**
 * Marca movimentações como sincronizadas
 */
export async function markMovementsAsSynced(uuids: string[]) {
  return cashRepository.markMovementsAsSynced(uuids);
}

/**
 * Busca todas as movimentações
 */
export async function getAllMovements() {
  return cashRepository.getAllMovements();
}
