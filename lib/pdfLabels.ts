import type { Country } from '@/types';

export interface PDFLabels {
  facture: string;
  devis: string;
  bonCommande: string;
  client: string;
  projet: string;
  description: string;
  quantite: string;
  prixUnitaire: string;
  total: string;
  totalHT: string;
  tva: string;
  totalTTC: string;
  totalTTCManual: string;
  date: string;
  signature: string;
  mentionsLegales: string;
  mentionsLegalesText: string;
  notes: string;
  siegeSocial: string;
  tel: string;
  email: string;
  siteWeb: string;
}

const LABELS: Record<Country, PDFLabels> = {
  MA: {
    facture: 'FACTURE',
    devis: 'DEVIS',
    bonCommande: 'BON DE COMMANDE',
    client: 'Client',
    projet: 'Projet',
    description: 'Description',
    quantite: 'Quantité',
    prixUnitaire: 'Prix Unitaire',
    total: 'Total',
    totalHT: 'Total HT',
    tva: 'TVA (20%)',
    totalTTC: 'Total TTC',
    totalTTCManual: 'Total TTC (saisi)',
    date: 'Date',
    signature: 'Signature',
    mentionsLegales: 'Mentions Légales',
    mentionsLegalesText: 'Art 89 – II – 1° - c, Code Général des Impôts.',
    notes: 'Notes',
    siegeSocial: 'SIÈGE SOCIAL',
    tel: 'Tel',
    email: 'Email',
    siteWeb: 'Site Web',
  },
  ES: {
    facture: 'FACTURA',
    devis: 'PRESUPUESTO',
    bonCommande: 'PEDIDO',
    client: 'Cliente',
    projet: 'Proyecto',
    description: 'Descripción',
    quantite: 'Cantidad',
    prixUnitaire: 'Precio Unit.',
    total: 'Total',
    totalHT: 'Total IVA excl.',
    tva: 'IVA (21%)',
    totalTTC: 'Total IVA incl.',
    totalTTCManual: 'Total IVA incl. (introducido)',
    date: 'Fecha',
    signature: 'Firma',
    mentionsLegales: 'Información legal',
    mentionsLegalesText: 'Ley 37/1992 del Impuesto sobre el Valor Añadido.',
    notes: 'Notas',
    siegeSocial: 'DOMICILIO SOCIAL',
    tel: 'Tel',
    email: 'Email',
    siteWeb: 'Web',
  },
};

export function getPDFLabels(country: Country = 'MA'): PDFLabels {
  return LABELS[country] ?? LABELS.MA;
}
