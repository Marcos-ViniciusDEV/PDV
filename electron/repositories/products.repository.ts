import { eq } from "drizzle-orm";
import { getDb } from "../db/config";
import { products, type Product, type InsertProduct } from "../db/schema";

/**
 * Repository para operações com produtos
 * Responsabilidade: Acesso a dados de produtos (Single Responsibility)
 */

/**
 * Busca todos os produtos ativos
 */
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.select().from(products).where(eq(products.ativo, 1));
}

/**
 * Busca produto por código de barras
 */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(products)
    .where(eq(products.codigoBarras, barcode))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca produto por ID
 */
export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca produto por código
 */
export async function getProductByCode(codigo: string): Promise<Product | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(products)
    .where(eq(products.codigo, codigo))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Atualiza ou insere produtos (para sincronização)
 * Usa INSERT ... ON DUPLICATE KEY UPDATE
 */
export async function upsertProducts(productList: InsertProduct[]): Promise<void> {
  if (productList.length === 0) return;
  
  const db = await getDb();
  
  // Drizzle não tem upsert nativo para MySQL, então fazemos manualmente
  for (const product of productList) {
    const existing = await getProductById(product.id!);
    
    if (existing) {
      await db
        .update(products)
        .set({
          codigo: product.codigo,
          codigoBarras: product.codigoBarras,
          descricao: product.descricao,
          precoVenda: product.precoVenda,
          unidade: product.unidade,
          estoque: product.estoque,
          ativo: product.ativo,
        })
        .where(eq(products.id, product.id!));
    } else {
      await db.insert(products).values(product);
    }
  }
  
  console.log(`[Products Repository] Upserted ${productList.length} products`);
}

/**
 * Limpa todos os produtos (usado antes de sincronização completa)
 */
export async function clearAllProducts(): Promise<void> {
  const db = await getDb();
  await db.delete(products);
  console.log("[Products Repository] Cleared all products");
}
