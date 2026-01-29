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
  createdAt: Date;
  updatedAt: Date;
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

export interface Document {
  id: string;
  type: 'facture' | 'devis' | 'bon_commande';
  projectId?: string;
  clientId: string;
  number: string;
  date: Date;
  dueDate?: Date;
  items: DocumentItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'brouillon' | 'envoye' | 'paye' | 'annule';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
