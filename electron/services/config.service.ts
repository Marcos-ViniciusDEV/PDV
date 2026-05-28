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
      empresaCnpj: data.empresaCnpj || data.cnpj || existingConfig.empresaCnpj || null,
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
      empresaCnpj: data.empresaCnpj || data.cnpj || null,
      pdvId: data.pdvId,
      tokenAutenticacao: data.tokenAutenticacao,
      urlBackend: data.urlBackend,
      atualizadoEm: new Date(),
    });
  }
  
  return true;
}

/**
 * Aplica a configuracao fiscal recebida pela carga do ERP.
 */
export async function applyFiscalConfig(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const existingConfig = await getConfig();
  if (!existingConfig) {
    console.warn("[Config Service] Fiscal config received before local activation. Ignoring.");
    return false;
  }

  await db.update(configuracoes).set({
    habilitarNfce: !!data.habilitarNfce,
    ambienteFiscal: data.ambiente || "HOMOLOGACAO",
    regimeTributario: data.regimeTributario || "SIMPLES_NACIONAL",
    serieNfce: Number(data.serieNfce || 1),
    serieNfe: Number(data.serieNfe || 1),
    proximoNumeroNfce: Number(data.proximoNumeroNfce || 1),
    proximoNumeroNfe: Number(data.proximoNumeroNfe || 1),
    idTokenIsc: data.idTokenIsc || null,
    cscConfigurado: !!data.cscConfigurado,
    certificadoConfigurado: !!data.certificadoConfigurado,
    certificadoValidade: data.certificadoValidade ? new Date(data.certificadoValidade) : null,
    fiscalAtualizadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(configuracoes.id, existingConfig.id));

  console.log(`[Config Service] Fiscal mode updated: NFC-e ${data.habilitarNfce ? "enabled" : "disabled"}`);
  return true;
}

/**
 * Aplica configuracoes de pagamento recebidas pela carga do ERP.
 */
export async function applyPaymentConfig(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const existingConfig = await getConfig();
  if (!existingConfig) {
    console.warn("[Config Service] Payment config received before local activation. Ignoring.");
    return false;
  }

  if (data.empresaId && Number(data.empresaId) !== Number(existingConfig.empresaId)) {
    console.warn("[Config Service] Payment config rejected: empresaId does not match local activation.");
    return false;
  }

  if (existingConfig.empresaCnpj && data.cnpjEmpresa && existingConfig.empresaCnpj !== data.cnpjEmpresa) {
    console.warn("[Config Service] Payment config rejected: CNPJ does not match local activation.");
    return false;
  }

  await db.update(configuracoes).set({
    empresaCnpj: data.cnpjEmpresa || existingConfig.empresaCnpj || null,
    pagamentosVersaoCarga: Number(data.versaoCarga || 0),
    pagamentosConfigJson: JSON.stringify(data),
    pagamentosAtualizadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(configuracoes.id, existingConfig.id));

  console.log(`[Config Service] Payment config updated: version ${data.versaoCarga || 0}`);
  return true;
}

export async function getPaymentConfig() {
  const config = await getConfig();
  if (!config?.pagamentosConfigJson) return null;

  try {
    return JSON.parse(config.pagamentosConfigJson);
  } catch {
    return null;
  }
}
