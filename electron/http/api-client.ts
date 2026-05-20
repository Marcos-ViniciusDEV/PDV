import axios from "axios";
import dotenv from "dotenv";
import { getConfig } from "../services/config.service";

dotenv.config();

/**
 * Cliente HTTP para comunicação com API Central
 * Responsabilidade: Comunicação HTTP (Single Responsibility)
 */

const DEFAULT_API_URL = process.env.VITE_API_URL || "http://localhost:3000";
const TIMEOUT = 30000; // 30 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Delay helper para retry
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca catálogo inicial (produtos e usuários)
 */
export async function fetchCatalog() {
  const config = await getConfig();
  const apiUrl = config?.urlBackend || DEFAULT_API_URL;
  
  console.log("[API Client] Fetching catalog from:", `${apiUrl}/api/pdv/carga-inicial`);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {};
      if (config?.tokenAutenticacao) {
        headers['Authorization'] = `Bearer ${config.tokenAutenticacao}`;
      }

      const response = await axios.get(`${apiUrl}/api/pdv/carga-inicial`, {
        timeout: TIMEOUT,
        headers
      });
      
      if (response.data && response.data.success) {
        console.log("[API Client] ✅ Catalog fetched successfully");
        return response.data.data;
      }
      
      throw new Error("Invalid response format");
    } catch (error: any) {
      lastError = error;
      console.error(`[API Client] ❌ Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[API Client] Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError || new Error("Failed to fetch catalog");
}

/**
 * Sincroniza vendas e movimentos de caixa
 */
export async function syncBatch(data: {
  vendas: any[];
  movimentosCaixa: any[];
}) {
  const config = await getConfig();
  const apiUrl = config?.urlBackend || DEFAULT_API_URL;
  
  console.log("[API Client] Syncing batch:", {
    vendas: data.vendas.length,
    movimentos: data.movimentosCaixa.length,
  });
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {};
      if (config?.tokenAutenticacao) {
        headers['Authorization'] = `Bearer ${config.tokenAutenticacao}`;
      }

      const response = await axios.post(
        `${apiUrl}/api/pdv/sincronizar`,
        data,
        { 
          timeout: TIMEOUT,
          headers
        }
      );
      
      if (response.data && response.data.success) {
        console.log("[API Client] ✅ Batch synced successfully");
        return response.data.data;
      }
      
      throw new Error("Invalid response format");
    } catch (error: any) {
      lastError = error;
      console.error(`[API Client] ❌ Sync attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      
      if (error.response) {
        console.error("[API Client] Server response:", error.response.data);
      }
      
      if (attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`[API Client] Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError || new Error("Failed to sync batch");
}

/**
 * Verifica saúde da API (health check)
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const config = await getConfig();
    const apiUrl = config?.urlBackend || DEFAULT_API_URL;
    
    await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Envia heartbeat para API
 */
export async function sendHeartbeat(pdvId: string) {
  try {
    const config = await getConfig();
    const apiUrl = config?.urlBackend || DEFAULT_API_URL;
    const headers: Record<string, string> = {};
    if (config?.tokenAutenticacao) {
      headers['Authorization'] = `Bearer ${config.tokenAutenticacao}`;
    }

    await axios.post(
      `${apiUrl}/api/pdv/heartbeat`,
      { pdvId },
      { 
        timeout: 5000,
        headers
      }
    );
    return true;
  } catch (error) {
    return false;
  }
}
