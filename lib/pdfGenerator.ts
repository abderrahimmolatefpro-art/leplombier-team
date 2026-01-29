import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Client, Project } from '@/types';
import { formatDate } from './utils';
import { CompanyInfo } from './companyConfig';

// Fonction helper pour dessiner le tampon en texte
function drawStampText(
  pdf: jsPDF,
  stamp: { name: string; address: string; city: string },
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Dessiner le rectangle avec bordure en pointillés bleue
  pdf.setDrawColor(0, 102, 204); // Bleu
  pdf.setLineWidth(1.5);
  // Note: jsPDF doesn't support setLineDash directly, using solid line instead
  
  // Dessiner le rectangle
  pdf.rect(x, y, width, height, 'D');
  
  // Texte du tampon en bleu
  pdf.setTextColor(0, 102, 204); // Bleu
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  
  // Positionner le texte dans le tampon
  pdf.text(stamp.name, x + 3, y + 7);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(stamp.address, x + 3, y + 12);
  pdf.text(stamp.city, x + 3, y + 17);
  
  // Restaurer les paramètres
  pdf.setTextColor(0, 0, 0); // Remettre en noir
}

export async function generatePDFFromHTML(
  elementId: string = 'document-content',
  fileName?: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min((pdfWidth - 40) / imgWidth, (pdfHeight - 40) / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  const imgY = 10;

  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
  
  const finalFileName = fileName || `document-${Date.now()}.pdf`;
  pdf.save(finalFileName);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function generatePDFFromData(
  document: Document,
  client: Client | null,
  project: Project | null,
  companyInfo: CompanyInfo
): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Logo / Nom de l'entreprise (centré)
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  const companyNameWidth = pdf.getTextWidth(companyInfo.name);
  pdf.text(companyInfo.name, (pageWidth - companyNameWidth) / 2, yPos);
  yPos += 15;

  // Numéro de facture et date
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 204); // Bleu
  const docTitle = document.type === 'facture' ? 'FACTURE' : 
                   document.type === 'devis' ? 'DEVIS' : 'BON DE COMMANDE';
  pdf.text(`${docTitle} N° :`, margin, yPos);
  pdf.setTextColor(0, 0, 0); // Noir
  pdf.text(document.number, margin + 35, yPos);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date : ${formatDate(document.date)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Ligne de séparation
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Informations client
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Client :', margin, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  if (client) {
    pdf.text(client.name, margin + 5, yPos);
    yPos += 6;
    if (client.address) {
      pdf.text(client.address, margin + 5, yPos);
      yPos += 6;
    }
    if (client.postalCode && client.city) {
      pdf.text(`${client.postalCode} ${client.city}`, margin + 5, yPos);
      yPos += 6;
    }
    if (client.phone) {
      pdf.text(`Tél: ${client.phone}`, margin + 5, yPos);
      yPos += 6;
    }
    if (client.email) {
      pdf.text(`Email: ${client.email}`, margin + 5, yPos);
      yPos += 6;
    }
  }
  yPos += 5;

  // Projet si applicable
  if (project) {
    pdf.setFontSize(10);
    pdf.text(`Projet: ${project.title}`, margin, yPos);
    yPos += 8;
  }

  // Tableau
  const tableTop = yPos;
  const colWidths = [90, 25, 35, 30];
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

  // En-tête tableau (fond bleu)
  pdf.setFillColor(0, 102, 204);
  pdf.rect(colX[0], tableTop - 8, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 8, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', colX[0] + 2, tableTop - 2);
  pdf.text('Quantité', colX[1] + 2, tableTop - 2);
  pdf.text('Prix Unitaire', colX[2] + 2, tableTop - 2);
  pdf.text('Total', colX[3] + 2, tableTop - 2);
  
  yPos = tableTop + 2;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  // Lignes du tableau
  document.items.forEach((item) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = margin;
    }
    
    // Bordures
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(colX[0], yPos - 6, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 6, 'D');
    
    // Contenu
    const descriptionLines = pdf.splitTextToSize(item.description, colWidths[0] - 4);
    pdf.text(descriptionLines[0], colX[0] + 2, yPos - 2);
    pdf.text(item.quantity.toString(), colX[1] + 2, yPos - 2);
    pdf.text(formatNumber(item.unitPrice), colX[2] + 2, yPos - 2);
    pdf.text(formatNumber(item.total), colX[3] + 2, yPos - 2);
    
    yPos += 8;
    if (descriptionLines.length > 1) {
      yPos += (descriptionLines.length - 1) * 4;
    }
  });

  // Totaux
  yPos += 5;
  const totalsX = colX[2];
  pdf.setFontSize(10);
  pdf.text(`Total HT :`, totalsX, yPos);
  pdf.text(`${formatNumber(document.subtotal)} MAD`, colX[3], yPos, { align: 'right' });
  yPos += 6;
  pdf.text(`TVA (20%) :`, totalsX, yPos);
  pdf.text(`${formatNumber(document.tax)} MAD`, colX[3], yPos, { align: 'right' });
  yPos += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(`Total TTC :`, totalsX, yPos);
  pdf.setTextColor(0, 102, 204);
  pdf.text(`${formatNumber(document.total)} MAD`, colX[3], yPos, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // Signature et mentions légales
  yPos += 15;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Signature :', margin, yPos);
  
  // Tampon GROUPE OGINCE
  if (companyInfo.stamp) {
    const stampX = pageWidth - margin - 60;
    const stampY = yPos - 10;
    const stampWidth = 50;
    const stampHeight = 25;
    
    // Si une image du tampon est disponible, l'utiliser
    if (companyInfo.stamp.image) {
      try {
        // Charger et ajouter l'image du tampon
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = companyInfo.stamp.image;
        
        // Note: Pour que cela fonctionne, l'image doit être accessible
        // En production, utilisez generatePDFFromHTML qui capture automatiquement l'image
        pdf.addImage(img, 'PNG', stampX, stampY, stampWidth, stampHeight);
      } catch (error) {
        console.warn('Impossible de charger l\'image du tampon, utilisation du texte', error);
        // Fallback sur le texte si l'image ne peut pas être chargée
        drawStampText(pdf, companyInfo.stamp, stampX, stampY, stampWidth, stampHeight);
      }
    } else {
      // Utiliser le texte si pas d'image
      drawStampText(pdf, companyInfo.stamp, stampX, stampY, stampWidth, stampHeight);
    }
  } else {
    // Tampon par défaut si pas de stamp configuré
    pdf.setDrawColor(0, 102, 204);
    pdf.setLineWidth(0.5);
    // Note: jsPDF doesn't support setLineDash directly, using solid line instead
    const stampX = pageWidth - margin - 50;
    const stampY = yPos - 8;
    pdf.rect(stampX, stampY, 50, 20, 'D');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyInfo.name, stampX + 2, stampY + 5);
    if (companyInfo.address) {
      const addressLines = pdf.splitTextToSize(companyInfo.address, 46);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(addressLines[0], stampX + 2, stampY + 10);
    }
    // Note: jsPDF doesn't support setLineDash, removed
  }

  yPos += 20;
  pdf.setFontSize(8);
  pdf.text('Mentions Légales :', margin, yPos);
  yPos += 4;
  pdf.text('Art 89 – II – 1° - c, Code Général des Impôts.', margin, yPos);

  // Notes
  if (document.notes) {
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes :', margin, yPos);
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    const notesLines = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);
    pdf.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5;
  }

  // Pied de page
  if (yPos > 250) {
    pdf.addPage();
    yPos = margin;
  }
  
  yPos = 270;
  pdf.setDrawColor(200, 200, 200);
  // Note: jsPDF doesn't support setLineDash, using solid line instead
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  // Note: jsPDF doesn't support setLineDash, removed
  
  yPos += 5;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyInfo.name, (pageWidth - pdf.getTextWidth(companyInfo.name)) / 2, yPos);
  yPos += 4;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`SIÈGE SOCIAL: ${companyInfo.address}`, (pageWidth - pdf.getTextWidth(`SIÈGE SOCIAL: ${companyInfo.address}`)) / 2, yPos);
  yPos += 4;
  
  let footerText = '';
  if (companyInfo.rc) footerText += `RC: ${companyInfo.rc} `;
  if (companyInfo.ice) footerText += `ICE: ${companyInfo.ice} `;
  if (companyInfo.patente) footerText += `Patente: ${companyInfo.patente}`;
  if (footerText) {
    pdf.text(footerText.trim(), (pageWidth - pdf.getTextWidth(footerText.trim())) / 2, yPos);
    yPos += 4;
  }
  
  footerText = '';
  if (companyInfo.phone) footerText += `Tel : ${companyInfo.phone} `;
  if (companyInfo.email) footerText += `Email : ${companyInfo.email} `;
  if (companyInfo.website) footerText += `Site Web : ${companyInfo.website}`;
  if (footerText) {
    pdf.text(footerText.trim(), (pageWidth - pdf.getTextWidth(footerText.trim())) / 2, yPos);
  }

  const fileName = `${document.type}-${document.number}.pdf`;
  pdf.save(fileName);
}
