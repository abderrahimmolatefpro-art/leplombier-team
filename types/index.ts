export type UserRole = 'admin' | 'plombier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
  // Nouveaux champs
  assignedPlombierId?: string; // Plombier assigné au client
  ice?: string; // ICE pour facturation
  companyName?: string; // Nom de l'entreprise si client professionnel
  clientType?: 'particulier' | 'professionnel';
  source?: 'form' | 'manual'; // Source de création : formulaire web ou manuel
  accessCodeHash?: string; // Hash du code d'accès espace client (SHA-256)
  accessCodeSentAt?: Date; // Date d'envoi du dernier code
  createdAt: Date;
  updatedAt: Date;
}

// Code promo activé par l'admin pour un client
export interface ClientPromoCode {
  id: string;
  clientId: string;
  code: string; // ex: "PROMO10"
  label: string; // ex: "10% de réduction"
  discountType: 'percent' | 'fixed';
  discountValue: number; // 10 ou 50
  activatedByAdminId: string;
  activatedAt: Date;
  expiresAt?: Date;
  used: boolean;
  usedAt?: Date;
}

// Statistiques client
export interface ClientStats {
  totalRevenue: number; // Revenus totaux générés
  totalProjects: number;
  completedProjects: number;
  pendingProjects: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  plombierRevenue: number; // 60% des revenus
  companyRevenue: number; // 40% des revenus
  lastProjectDate?: Date;
  nextAppointment?: Date;
}

export type ProjectType = 'recherche_fuite' | 'reparation_lourde' | 'renovation_salle_bain';
export type ProjectStatus = 'en_attente' | 'en_cours' | 'en_pause' | 'termine' | 'annule';
export type ProgressStatus = 'non_commence' | 'en_cours' | 'termine';

export interface Project {
  id: string;
  clientId: string;
  type: ProjectType;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  estimatedDuration: number; // en jours
  teamLeaderId: string; // chef d'équipe
  plombierIds: string[]; // liste des plombiers
  progress: number; // 0-100
  progressStatus: ProgressStatus;
  address: string;
  amount?: number; // Montant du projet en DH (peut être saisi manuellement)
  hasInvoice?: boolean; // Si le projet a une facture associée
  paidByPlombierIds?: string[]; // Liste des IDs des plombiers qui ont payé leur part à la société pour ce projet
  plombierPercentage?: number; // Pourcentage pour le plombier (par défaut 60, le reste va à la société)
  companyAmount?: number; // Montant en MAD que la société reçoit (saisi manuellement)
  createdAt: Date;
  updatedAt: Date;
}

// Revenu manuel (sans facture, "en noir")
export interface ManualRevenue {
  id: string;
  clientId: string;
  projectId?: string; // Optionnel : peut être lié à un projet
  amount: number; // Montant en DH
  date: Date;
  description: string;
  plombierId?: string; // Plombier associé
  isBlackRevenue?: boolean; // Revenu "en noir" (sans facture)
  plombierHasPaid?: boolean; // Si le plombier a payé sa part à la société pour ce dépannage
  plombierPercentage?: number; // Pourcentage pour le plombier (par défaut 60, le reste va à la société)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanningEntry {
  id: string;
  plombierId: string;
  projectId?: string;
  date: Date;
  startTime?: string; // format HH:mm (optionnel)
  endTime?: string; // format HH:mm (optionnel)
  type: 'project' | 'congé' | 'indisponibilite';
  notes?: string;
  createdAt: Date;
}

export interface Recruitment {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  zones: 'casa' | 'rabat' | 'tanger' | 'marrakech' | 'agadir' | 'tetouan' | 'fes';
  address: string;
  status: 'pending' | 'contacted' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  type: 'facture' | 'devis' | 'bon_commande';
  projectId?: string; // Obligatoire si type === 'facture' et manualRevenueId non défini
  manualRevenueId?: string; // Obligatoire si type === 'facture' et projectId non défini
  clientId: string;
  number: string;
  date: Date;
  dueDate?: Date;
  items: DocumentItem[];
  subtotal: number;
  tax: number;
  total: number;
  includeTax?: boolean; // Optionnel : inclure la TVA (uniquement pour les devis, par défaut true)
  status: 'brouillon' | 'envoye' | 'paye' | 'annule';
  notes?: string;
  /** Descriptions affichées en bas du document sans prix (une ligne par entrée) */
  footerDescriptions?: string[];
  /** Total TTC saisi manuellement ; si défini, il remplace le total calculé */
  manualTotal?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Si true : ligne descriptive sans prix — afficher "—" pour qté, prix unitaire et total */
  descriptionOnly?: boolean;
  unit?: 'piece' | 'm2' | 'm' | 'm3' | 'kg' | 'heure' | 'jour' | 'unite'; // Unité de mesure
  length?: number; // Longueur (pour calculer m² ou m)
  width?: number; // Largeur (pour calculer m²)
  height?: number; // Hauteur (pour calculer m³)
  area?: number; // Surface calculée (m²)
  calculatedQuantity?: boolean; // Si la quantité est calculée automatiquement
}

// Modèles de messages (templates) pour envoi manuel
export interface AutoMessage {
  id: string;
  name: string;
  type: 'promotion' | 'warning';
  smsEnabled: boolean;
  emailEnabled: boolean;
  smsContent: string;
  emailSubject: string;
  emailContent: string;
  delayHours?: number; // Obsolète, conservé pour compatibilité Firestore
  enabled?: boolean; // Masquer ce modèle si false
  createdAt: Date;
  updatedAt: Date;
}

// Messages envoyés (historique)
export interface SentMessage {
  id: string;
  autoMessageId: string; // ID du message automatique utilisé
  clientId: string;
  projectId?: string; // Si lié à un projet
  manualRevenueId?: string; // Si lié à un dépannage
  type: 'sms' | 'email';
  status: 'sent' | 'failed';
  sentAt: Date;
  errorMessage?: string;
  createdAt: Date;
}
