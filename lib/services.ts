/**
 * Services plomberie - recherche rapide espace client & demo
 * Inspiré du formulaire WordPress pour aider le client à identifier rapidement son besoin
 */
export type ServicePriceType = 'fixe' | 'a_partir_de' | 'sur_devis';

export interface ServiceDetail {
  id: string;
  label: string;
  categoryId: string;
  priceType?: ServicePriceType;
  priceMin?: number;
  priceLabel?: string;
  visitRequired?: boolean;
}

export interface ServiceCategory {
  id: string;
  label: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'fuite', label: 'Problème de fuite' },
  { id: 'installation', label: 'Installer un nouvel équipement' },
  { id: 'reparation', label: 'Réparer un équipement en panne' },
  { id: 'entretien', label: 'Entretenir mon installation' },
  { id: 'visite', label: "Visite d'un expert plombier" },
];

export const SERVICE_DETAILS: ServiceDetail[] = [
  // Fuite
  { id: 'detection', label: 'Recherche de fuite', categoryId: 'fuite', priceType: 'fixe', priceMin: 700, priceLabel: '700 DH fixe', visitRequired: true },
  { id: 'reparation-visible', label: 'Réparation de fuite visible', categoryId: 'fuite' },
  { id: 'reparation-cachee', label: 'Réparation de fuite cachée', categoryId: 'fuite', visitRequired: true },
  { id: 'robinet', label: 'Réparation de robinet qui fuit', categoryId: 'fuite' },
  { id: 'toilette', label: 'Réparation de toilette qui fuit', categoryId: 'fuite' },
  // Installation
  { id: 'salle-de-bain', label: 'Salle de bain complète', categoryId: 'installation', visitRequired: true },
  { id: 'sanitaires', label: 'Sanitaires (WC, lavabo, douche)', categoryId: 'installation' },
  { id: 'chauffe-eau', label: 'Chauffe-eau', categoryId: 'installation' },
  { id: 'chauffage', label: 'Chaudière ou chauffage central', categoryId: 'installation', visitRequired: true },
  { id: 'pompe-chaleur', label: 'Pompe à chaleur', categoryId: 'installation', visitRequired: true },
  { id: 'climatiseur', label: 'Climatiseur', categoryId: 'installation' },
  { id: 'piscine', label: 'Équipement de piscine', categoryId: 'installation', visitRequired: true },
  { id: 'electromenager', label: 'Électroménager', categoryId: 'installation' },
  { id: 'traitement-eau', label: "Système de traitement d'eau complexe", categoryId: 'installation', visitRequired: true },
  { id: 'hamam', label: 'Construction de hamam traditionnel', categoryId: 'installation', visitRequired: true },
  { id: 'renovation', label: 'Rénovation complète de plomberie', categoryId: 'installation', visitRequired: true },
  // Réparation
  { id: 'depannage-rapide', label: 'Dépannage rapide', categoryId: 'reparation', priceType: 'a_partir_de', priceMin: 150, priceLabel: '150 DH' },
  { id: 'chauffage-panne', label: 'Chauffage en panne', categoryId: 'reparation' },
  { id: 'eau-chaude-panne', label: 'Eau chaude en panne', categoryId: 'reparation' },
  { id: 'canalisation', label: 'Canalisation bouchée', categoryId: 'reparation' },
  { id: 'climatiseur-panne', label: 'Climatiseur', categoryId: 'reparation' },
  { id: 'piscine-panne', label: 'Équipement de piscine', categoryId: 'reparation' },
  { id: 'lave-vaisselle', label: 'Lave-vaisselle ou lave-linge', categoryId: 'reparation' },
  { id: 'problemes-recurrents', label: 'Problèmes récurrents de plomberie', categoryId: 'reparation', visitRequired: true },
  // Entretien
  { id: 'entretien-chauffage', label: 'Entretien chauffage', categoryId: 'entretien' },
  { id: 'entretien-chauffe-eau', label: 'Entretien chauffe-eau', categoryId: 'entretien' },
  { id: 'entretien-piscine', label: 'Entretien piscine', categoryId: 'entretien' },
  { id: 'entretien-climatisation', label: 'Entretien climatisation', categoryId: 'entretien' },
  { id: 'entretien-eau', label: "Entretien traitement d'eau", categoryId: 'entretien' },
  // Visite
  { id: 'visite-expert', label: "Visite d'un expert plombier", categoryId: 'visite', priceType: 'a_partir_de', priceMin: 250, priceLabel: '250 DH', visitRequired: true },
];

export function getServiceById(id: string): ServiceDetail | undefined {
  return SERVICE_DETAILS.find((s) => s.id === id);
}

export function getDetailsByCategory(categoryId: string): ServiceDetail[] {
  return SERVICE_DETAILS.filter((s) => s.categoryId === categoryId);
}

export function getCategoryById(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}

/** Services essentiels pour sélection rapide (commander / demo) - UX fluide */
export const QUICK_SERVICES: ServiceDetail[] = [
  { id: 'depannage-rapide', label: 'Dépannage rapide', categoryId: 'reparation', priceType: 'a_partir_de', priceMin: 150, priceLabel: '150 DH' },
  { id: 'robinet', label: 'Fuite robinet / toilette', categoryId: 'fuite' },
  { id: 'eau-chaude-panne', label: 'Eau chaude en panne', categoryId: 'reparation' },
  { id: 'canalisation', label: 'Canalisation bouchée', categoryId: 'reparation' },
  { id: 'chauffe-eau', label: 'Chauffe-eau', categoryId: 'installation' },
  { id: 'visite-expert', label: 'Visite expert', categoryId: 'visite', priceType: 'a_partir_de', priceMin: 250, priceLabel: '250 DH', visitRequired: true },
];
