export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  siret?: string;
  rc?: string;
  ice?: string;
  patente?: string;
  logo?: string;
  stamp?: {
    name: string;
    address: string;
    city: string;
    image?: string; // Chemin vers l'image du tampon
  };
}

export const companyInfo: CompanyInfo = {
  name: 'Le Plombier.MA',
  address: 'Rue Essanaoubre - Immeuble 2 - 4ème Etage - Appt N°12 - Casablanca',
  phone: '+212 706 404 147',
  email: 'contact@leplombier.ma',
  website: 'www.leplombier.ma',
  rc: '681785',
  ice: '003755962000004',
  patente: '34214522',
  logo: '/logo.png', // Vous pouvez ajouter votre logo dans public/logo.png
  stamp: {
    name: 'GROUPE OGINCE',
    address: '2, Rue Essanaouber N°12',
    city: '4ème Etage - Casablanca',
    image: '/stamp.png', // Image du tampon dans public/stamp.png
  },
};
