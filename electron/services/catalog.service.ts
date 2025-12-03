import * as productsRepository from "../repositories/products.repository";
import * as usersRepository from "../repositories/users.repository";

/**
 * Service de catálogo
 * Responsabilidade: Gerenciamento de catálogo sincronizado (Single Responsibility)
 * Depende de: products.repository, users.repository (Dependency Inversion)
 */

interface CatalogData {
  produtos: Array<{
    id: number;
    codigo: string;
    codigoBarras?: string;
    descricao: string;
    precoVenda: number;
    unidade: string;
    estoque: number;
  }>;
  usuarios: Array<{
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    role: string;
  }>;
}

/**
 * Carrega catálogo da API Central
 * Atualiza produtos e usuários locais
 */
export async function loadCatalog(data: CatalogData): Promise<void> {
  console.log("[Catalog Service] Loading catalog...");
  console.log(`[Catalog Service] ${data.produtos?.length || 0} products, ${data.usuarios?.length || 0} users`);
  
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
      ativo: 1,
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
