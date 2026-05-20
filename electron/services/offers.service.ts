import * as offersRepository from "../repositories/offers.repository";

/**
 * Service de Ofertas
 */

export async function getActiveOffers() {
  return offersRepository.getActiveOffers();
}

export async function getAllOffers() {
  return offersRepository.getAllOffers();
}
