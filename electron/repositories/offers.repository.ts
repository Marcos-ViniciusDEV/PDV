import { eq, and, lte, gte, desc } from "drizzle-orm";
import { getDb } from "../db/config";
import { offers, type InsertOffer, type Offer } from "../db/schema";

/**
 * Repository para ofertas
 */

export async function getActiveOffers(): Promise<Offer[]> {
  const db = await getDb();
  const now = new Date();
  
  return db.select().from(offers).where(
    and(
      eq(offers.ativo, true),
      lte(offers.dataInicio, now),
      gte(offers.dataFim, now)
    )
  );
}

export async function getAllOffers(): Promise<Offer[]> {
  const db = await getDb();
  return db.select().from(offers).orderBy(desc(offers.createdAt));
}

export async function getOffersByProduct(productId: number): Promise<Offer[]> {
  const db = await getDb();
  return db.select().from(offers).where(eq(offers.productId, productId));
}
