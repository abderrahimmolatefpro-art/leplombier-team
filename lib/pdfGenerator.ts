import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Client, Project } from '@/types';
import type { Country } from '@/types';
import { formatDate } from './utils';
import { CompanyInfo, getActiveCountry, COUNTRY_CONFIG } from './companyConfig';
import { getPDFLabels } from './pdfLabels';

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

export function formatNumber(num: number, country: Country = 'MA'): string {
  const locale = country === 'ES' ? 'es-ES' : 'fr-FR';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function generatePDFFromData(
  document: Document,
  client: Client | null,
  project: Project | null,
  companyInfo: CompanyInfo,
  country: Country = getActiveCountry()
): void {
  const labels = getPDFLabels(country);
  const { currency } = COUNTRY_CONFIG[country];
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
  const docTitle = document.type === 'facture' ? labels.facture :
                   document.type === 'devis' ? labels.devis : labels.bonCommande;
  pdf.text(`${docTitle} N° :`, margin, yPos);
  pdf.setTextColor(0, 0, 0); // Noir
  pdf.text(document.number, margin + 35, yPos);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${labels.date} : ${formatDate(document.date)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Ligne de séparation
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Informations client
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${labels.client} :`, margin, yPos);
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
      pdf.text(`${labels.tel}: ${client.phone}`, margin + 5, yPos);
      yPos += 6;
    }
    if (client.email) {
      pdf.text(`${labels.email}: ${client.email}`, margin + 5, yPos);
      yPos += 6;
    }
  }
  yPos += 5;

  // Projet si applicable
  if (project) {
    pdf.setFontSize(10);
    pdf.text(`${labels.projet}: ${project.title}`, margin, yPos);
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
  pdf.text(labels.description, colX[0] + 2, tableTop - 2);
  pdf.text(labels.quantite, colX[1] + 2, tableTop - 2);
  pdf.text(labels.prixUnitaire, colX[2] + 2, tableTop - 2);
  pdf.text(labels.total, colX[3] + 2, tableTop - 2);
  
  yPos = tableTop + 2;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  // Lignes du tableau
  document.items.forEach((item) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = margin;
    }
    
    const isDescOnly = !!item.descriptionOnly;
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(colX[0], yPos - 6, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 6, 'D');
    
    const descriptionLines = pdf.splitTextToSize(item.description, colWidths[0] - 4);
    pdf.text(descriptionLines[0], colX[0] + 2, yPos - 2);
    pdf.text(isDescOnly && item.quantity <= 0 ? '—' : item.quantity.toString(), colX[1] + 2, yPos - 2);
    pdf.text(isDescOnly && item.unitPrice <= 0 ? '—' : formatNumber(item.unitPrice, country), colX[2] + 2, yPos - 2);
    pdf.text(isDescOnly && item.total <= 0 ? '—' : formatNumber(item.total, country), colX[3] + 2, yPos - 2);
    
    yPos += 8;
    if (descriptionLines.length > 1) {
      yPos += (descriptionLines.length - 1) * 4;
    }
  });

  // Descriptions supplémentaires (sans prix)
  if (document.footerDescriptions && document.footerDescriptions.length > 0) {
    yPos += 5;
    document.footerDescriptions.forEach((line) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
      lines.forEach((l: string) => {
        pdf.text(l, margin, yPos);
        yPos += 5;
      });
    });
  }

  // Totaux
  yPos += 5;
  const totalsX = colX[2];
  const displayTotal = document.manualTotal ?? document.total;
  const noTax = (document.type === 'devis' || document.type === 'bon_commande') && document.includeTax === false && document.manualTotal == null;
  pdf.setFontSize(10);
  if (!noTax && document.manualTotal == null) {
    pdf.text(`${labels.totalHT} :`, totalsX, yPos);
    pdf.text(`${formatNumber(document.subtotal, country)} ${currency}`, colX[3], yPos, { align: 'right' });
    yPos += 6;
    pdf.text(`${labels.tva} :`, totalsX, yPos);
    pdf.text(`${formatNumber(document.tax, country)} ${currency}`, colX[3], yPos, { align: 'right' });
    yPos += 6;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const totalLabel = noTax ? `${labels.total} :` : `${document.manualTotal != null ? labels.totalTTCManual : labels.totalTTC} :`;
  pdf.text(totalLabel, totalsX, yPos);
  pdf.setTextColor(0, 102, 204);
  pdf.text(`${formatNumber(displayTotal, country)} ${currency}`, colX[3], yPos, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // Signature et mentions légales
  yPos += 15;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${labels.signature} :`, margin, yPos);
  
  yPos += 20;
  pdf.setFontSize(8);
  pdf.text(`${labels.mentionsLegales} :`, margin, yPos);
  yPos += 4;
  pdf.text(labels.mentionsLegalesText, margin, yPos);

  // Notes
  if (document.notes) {
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${labels.notes} :`, margin, yPos);
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
  pdf.text(`${labels.siegeSocial}: ${companyInfo.address}`, (pageWidth - pdf.getTextWidth(`${labels.siegeSocial}: ${companyInfo.address}`)) / 2, yPos);
  yPos += 4;
  
  let footerText = '';
  if (country === 'ES') {
    if (companyInfo.cif) footerText += `CIF: ${companyInfo.cif}`;
  } else {
    if (companyInfo.rc) footerText += `RC: ${companyInfo.rc} `;
    if (companyInfo.patente) footerText += `Patente: ${companyInfo.patente}`;
  }
  if (footerText) {
    pdf.text(footerText.trim(), (pageWidth - pdf.getTextWidth(footerText.trim())) / 2, yPos);
    yPos += 4;
  }
  
  footerText = '';
  if (companyInfo.phone) footerText += `${labels.tel} : ${companyInfo.phone} `;
  if (companyInfo.email) footerText += `${labels.email} : ${companyInfo.email} `;
  if (companyInfo.website) footerText += `${labels.siteWeb} : ${companyInfo.website}`;
  if (footerText) {
    pdf.text(footerText.trim(), (pageWidth - pdf.getTextWidth(footerText.trim())) / 2, yPos);
  }

  const fileName = `${document.type}-${document.number}.pdf`;
  pdf.save(fileName);
}
