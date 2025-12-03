import * as offersRepository from "../repositories/offers.repository";
import type { InsertOffer } from "../db/schema";

/**
 * Service de Ofertas
 */

export async function getActiveOffers() {
  return offersRepository.getActiveOffers();
}

export async function getAllOffers() {
  return offersRepository.getAllOffers();
}
