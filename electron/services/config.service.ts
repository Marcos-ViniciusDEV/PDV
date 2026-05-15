import { getDb } from "../db/config";
import { configuracoes } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Retorna a configuração local (Tenant/Empresa vinculada)
 */
export async function getConfig() {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(configuracoes).limit(1);
  return results.length > 0 ? results[0] : null;
}

/**
 * Salva as configurações de vínculo com o Tenant (SaaS)
 */
export async function saveConfig(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const existingConfig = await getConfig();

  if (existingConfig) {
    // Atualiza
    await db.update(configuracoes).set({
      empresaId: data.empresaId,
      empresaNome: data.empresaNome,
      pdvId: data.pdvId,
      tokenAutenticacao: data.tokenAutenticacao,
      urlBackend: data.urlBackend,
      atualizadoEm: new Date(),
    }).where(eq(configuracoes.id, existingConfig.id));
  } else {
    // Cria
    await db.insert(configuracoes).values({
      empresaId: data.empresaId,
      empresaNome: data.empresaNome,
      pdvId: data.pdvId,
      tokenAutenticacao: data.tokenAutenticacao,
      urlBackend: data.urlBackend,
      atualizadoEm: new Date(),
    });
  }
  
  return true;
}
