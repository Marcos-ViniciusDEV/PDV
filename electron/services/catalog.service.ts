import * as productsRepository from "../repositories/products.repository";
import * as usersRepository from "../repositories/users.repository";
import * as configService from "./config.service";

/**
 * Service de catálogo
 * Responsabilidade: Gerenciamento de catálogo sincronizado (Single Responsibility)
 * Depende de: products.repository, users.repository (Dependency Inversion)
 */

interface CatalogData {
  empresa?: {
    id: number;
    cnpj?: string | null;
    razaoSocial?: string | null;
    nomeFantasia?: string | null;
  } | null;
  produtos: Array<{
    id: number;
    codigo: string;
    codigoBarras?: string;
    descricao: string;
    precoVenda: number;
    unidade: string;
    estoque: number;
    ativo?: boolean | number;
    ncm?: string | null;
    cest?: string | null;
    origem?: number | null;
    cstIcms?: string | null;
    csosnIcms?: string | null;
    cfopPadraoVenda?: string | null;
    aliquotaIcms?: number | null;
    aliquotaPis?: number | null;
    aliquotaCofins?: number | null;
    pisCst?: string | null;
    cofinsCst?: string | null;
  }>;
  usuarios: Array<{
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    role: string;
  }>;
  configuracaoFiscal?: any;
  configuracoesPagamento?: any;
}

/**
 * Carrega catálogo da API Central
 * Atualiza produtos e usuários locais
 */
export async function loadCatalog(data: CatalogData): Promise<void> {
  console.log("[Catalog Service] Loading catalog...");
  console.log(`[Catalog Service] ${data.produtos?.length || 0} products, ${data.usuarios?.length || 0} users`);
  
  // A carga e completa: itens ausentes nao devem continuar disponiveis no caixa.
  await productsRepository.deactivateAllProducts();

  // Atualizar produtos
  if (data.produtos && data.produtos.length > 0) {
    const products = data.produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      codigoBarras: p.codigoBarras || null,
      descricao: p.descricao,
      precoVenda: p.precoVenda,
      unidade: p.unidade,
      estoque: p.estoque,
      ativo: p.ativo === false || p.ativo === 0 ? 0 : 1,
      ncm: p.ncm || null,
      cest: p.cest || null,
      origem: p.origem ?? 0,
      cstIcms: p.cstIcms || null,
      csosnIcms: p.csosnIcms || null,
      cfopPadraoVenda: p.cfopPadraoVenda || null,
      aliquotaIcms: p.aliquotaIcms || 0,
      aliquotaPis: p.aliquotaPis || 0,
      aliquotaCofins: p.aliquotaCofins || 0,
      pisCst: p.pisCst || null,
      cofinsCst: p.cofinsCst || null,
    }));
    
    await productsRepository.upsertProducts(products);
  }
  
  // Atualizar usuários
  if (data.usuarios && data.usuarios.length > 0) {
    const users = data.usuarios.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
    }));
    
    await usersRepository.upsertUsers(users);
  }

  if (data.empresa) {
    const currentConfig = await configService.getConfig();
    if (currentConfig) {
      await configService.saveConfig({
        ...currentConfig,
        empresaId: data.empresa.id,
        empresaNome: data.empresa.nomeFantasia || data.empresa.razaoSocial || currentConfig.empresaNome,
        empresaCnpj: data.empresa.cnpj || currentConfig.empresaCnpj,
      });
    }
  }

  if (data.configuracaoFiscal) {
    await configService.applyFiscalConfig(data.configuracaoFiscal);
  }

  if (data.configuracoesPagamento) {
    await configService.applyPaymentConfig(data.configuracoesPagamento);
  }
  
  console.log("[Catalog Service] ✅ Catalog loaded successfully");
}

import * as offersService from "./offers.service";

// ... (existing code)

/**
 * Aplica ofertas aos produtos
 */
async function applyOffers(product: any) {
  if (!product) return null;
  
  const activeOffers = await offersService.getActiveOffers();
  const offer = activeOffers.find(o => o.productId === product.id);
  
  if (offer) {
    return {
      ...product,
      originalPrice: product.precoVenda,
      precoVenda: offer.precoOferta,
      hasOffer: true,
      offerId: offer.id
    };
  }
  
  return {
    ...product,
    hasOffer: false
  };
}

/**
 * Busca todos os produtos
 */
export async function getAllProducts() {
  const products = await productsRepository.getAllProducts();
  const activeOffers = await offersService.getActiveOffers();
  
  return products.map(p => {
    const offer = activeOffers.find(o => o.productId === p.id);
    if (offer) {
      return {
        ...p,
        originalPrice: p.precoVenda,
        precoVenda: offer.precoOferta,
        hasOffer: true,
        offerId: offer.id
      };
    }
    return { ...p, hasOffer: false };
  });
}

/**
 * Busca produto por código de barras
 */
export async function getProductByBarcode(barcode: string) {
  const product = await productsRepository.getProductByBarcode(barcode);
  return applyOffers(product);
}

/**
 * Busca produto por código
 */
export async function getProductByCode(codigo: string) {
  const product = await productsRepository.getProductByCode(codigo);
  return applyOffers(product);
}
