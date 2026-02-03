'use client';

import { Document, Client, Project } from '@/types';
import { formatDate, formatCurrency, formatNumberFR } from '@/lib/utils';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { CompanyInfo } from '@/lib/companyConfig';
import { Download, Printer } from 'lucide-react';
import { generatePDFFromHTML } from '@/lib/pdfGenerator';

interface DocumentViewProps {
  document: Document;
  client: Client | null;
  project: Project | null;
  companyInfo: CompanyInfo;
}

export default function DocumentView({ document, client, project, companyInfo }: DocumentViewProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `${document.type}-${document.number}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleGeneratePDF = async () => {
    try {
      await generatePDFFromHTML('document-content', `${document.type}-${document.number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const getDocumentTitle = () => {
    switch (document.type) {
      case 'facture':
        return 'FACTURE';
      case 'devis':
        return 'DEVIS';
      case 'bon_commande':
        return 'BON DE COMMANDE';
      default:
        return 'DOCUMENT';
    }
  };


  return (
    <div className="space-y-6">
      {/* Boutons d'action */}
      <div className="flex justify-end gap-4 mb-4">
        <button
          onClick={handleGeneratePDF}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <Download size={20} />
          <span>Télécharger PDF</span>
        </button>
        <button
          onClick={handlePrint}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Printer size={20} />
          <span>Imprimer</span>
        </button>
      </div>

      {/* Document */}
      <div
        ref={componentRef}
        className="bg-white p-8 max-w-4xl mx-auto shadow-lg"
        id="document-content"
      >
        {/* Logo et nom de l'entreprise */}
        <div className="text-center mb-8">
          {companyInfo.logo ? (
            <img
              src={companyInfo.logo}
              alt={companyInfo.name}
              className="h-16 mx-auto mb-4"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <span className="text-gray-700">Le Plombier</span>
              <span className="text-primary-600">.MA</span>
            </h1>
          )}
        </div>

        {/* Numéro de facture et date */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300">
          <div>
            <h2 className="text-xl font-bold text-primary-600 mb-1">
              {getDocumentTitle()} N° : <span className="text-gray-900">{document.number}</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Date :</span> {formatDate(document.date)}
            </p>
            {document.dueDate && (
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Échéance :</span> {formatDate(document.dueDate)}
              </p>
            )}
          </div>
        </div>

        {/* Informations client */}
        <div className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">Client : {client?.name || 'Non spécifié'}</p>
            {client?.address && (
              <p className="text-sm text-gray-600">{client.address}</p>
            )}
            {client?.postalCode && client?.city && (
              <p className="text-sm text-gray-600">{client.postalCode} {client.city}</p>
            )}
            {client?.phone && (
              <p className="text-sm text-gray-600 mt-1">Tél: {client.phone}</p>
            )}
            {client?.email && (
              <p className="text-sm text-gray-600">Email: {client.email}</p>
            )}
          </div>
        </div>

        {/* Référence projet si applicable */}
        {project && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Projet:</span> {project.title}
            </p>
          </div>
        )}

        {/* Tableau des articles */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary-700 text-white">
                <th className="border border-primary-600 px-4 py-3 text-left text-sm font-semibold">
                  Description
                </th>
                <th className="border border-primary-600 px-4 py-3 text-center text-sm font-semibold w-24">
                  Quantité
                </th>
                <th className="border border-primary-600 px-4 py-3 text-right text-sm font-semibold w-32">
                  Prix Unitaire (MAD)
                </th>
                <th className="border border-primary-600 px-4 py-3 text-right text-sm font-semibold w-32">
                  Total (MAD)
                </th>
              </tr>
            </thead>
            <tbody>
              {document.items.map((item, index) => {
                const getUnitLabel = (unit?: string) => {
                  const labels: Record<string, string> = {
                    piece: 'pièce',
                    m2: 'm²',
                    m: 'm',
                    m3: 'm³',
                    kg: 'kg',
                    heure: 'h',
                    jour: 'j',
                    unite: 'unité',
                  };
                  return labels[unit || 'piece'] || '';
                };

                const getQuantityDisplay = () => {
                  let qty = formatNumberFR(item.quantity);
                  if (item.unit === 'm2') {
                    return `${qty} m²`;
                  } else if (item.unit === 'm' && item.length) {
                    return `${qty} m (${item.length} m)`;
                  } else if (item.unit === 'm3' && item.length && item.width && item.height) {
                    return `${qty} m³ (${item.length} × ${item.width} × ${item.height} m)`;
                  } else {
                    return qty;
                  }
                };

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                      {getQuantityDisplay()}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-600">
                      {formatNumberFR(item.unitPrice)} MAD
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatNumberFR(item.total)} MAD
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            {/* Pour les devis sans TVA, on affiche directement le total sans ligne HT */}
            {document.type === 'devis' && document.includeTax === false ? (
              <>
                <div className="flex justify-between py-3 border-t-2 border-gray-400 mt-2">
                  <span className="text-lg font-bold text-gray-900">Total TTC :</span>
                  <span className="text-lg font-bold text-primary-600">{formatNumberFR(document.total)} MAD</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="text-sm text-gray-700 font-medium">Total HT :</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumberFR(document.subtotal)} MAD</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="text-sm text-gray-700 font-medium">TVA (20%) :</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumberFR(document.tax)} MAD</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-gray-400 mt-2">
                  <span className="text-lg font-bold text-gray-900">Total TTC :</span>
                  <span className="text-lg font-bold text-primary-600">{formatNumberFR(document.total)} MAD</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Signature */}
        <div className="mb-6">
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-8">Signature :</p>
              <p className="text-xs text-gray-500 mt-4">Mentions Légales :</p>
              <p className="text-xs text-gray-500">Art 89 – II – 1° - c, Code Général des Impôts.</p>
            </div>
            {/* Tampon - Uniquement pour les factures */}
            {document.type === 'facture' && (
              <div className="flex-shrink-0 ml-8">
                <img
                  src="/stamp.png"
                  alt="Tampon"
                  className="object-contain"
                  style={{ width: '300px', height: '300px', maxWidth: '350px', maxHeight: '350px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {document.notes && (
          <div className="mt-8 pt-6 border-t border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes :</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{document.notes}</p>
          </div>
        )}

        {/* Pied de page avec informations entreprise */}
        <div className="mt-12 pt-6 border-t-2 border-dashed border-gray-400">
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-900">{companyInfo.name}</p>
            <p>
              <span className="font-semibold">SIÈGE SOCIAL:</span> {companyInfo.address}
            </p>
            <div className="flex justify-center items-center gap-4 flex-wrap mt-2">
              {companyInfo.rc && (
                <span>RC: {companyInfo.rc}</span>
              )}
              {companyInfo.patente && (
                <span>Patente: {companyInfo.patente}</span>
              )}
            </div>
            <div className="flex justify-center items-center gap-4 flex-wrap mt-2">
              {companyInfo.phone && (
                <span>Tel : {companyInfo.phone}</span>
              )}
              {companyInfo.email && (
                <span className="text-primary-600">Email : {companyInfo.email}</span>
              )}
              {companyInfo.website && (
                <span>Site Web : {companyInfo.website}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
