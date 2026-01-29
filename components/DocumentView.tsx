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
            {client?.id && (
              <p className="text-sm text-gray-600 mt-1">ICE : {client.id}</p>
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
              {document.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-600">
                    {formatNumberFR(item.unitPrice)}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {formatNumberFR(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
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
          </div>
        </div>

        {/* Signature */}
        <div className="mb-6 flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-700 mb-8">Signature :</p>
            <p className="text-xs text-gray-500 mt-4">Mentions Légales :</p>
            <p className="text-xs text-gray-500">Art 89 – II – 1° - c, Code Général des Impôts.</p>
          </div>
          <div className="text-right">
            {/* Tampon GROUPE OGINCE */}
            {companyInfo.stamp && (
              <>
                {companyInfo.stamp.image ? (
                  // Utiliser l'image du tampon si disponible
                  <img
                    src={companyInfo.stamp.image}
                    alt="Tampon GROUPE OGINCE"
                    className="inline-block"
                    style={{
                      maxWidth: '180px',
                      height: 'auto',
                      transform: 'rotate(5deg)',
                    }}
                  />
                ) : (
                  // Fallback sur le texte si pas d'image
                  <div 
                    className="inline-block p-3 bg-white"
                    style={{
                      transform: 'rotate(5deg)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      border: '2px dashed #0284c7',
                      borderRadius: '4px',
                      borderWidth: '2px',
                    }}
                  >
                    <p 
                      className="text-sm font-bold leading-tight mb-1" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        color: '#0284c7',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {companyInfo.stamp.name}
                    </p>
                    <p 
                      className="text-xs leading-tight mb-0.5" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        color: '#0284c7',
                      }}
                    >
                      {companyInfo.stamp.address}
                    </p>
                    <p 
                      className="text-xs leading-tight" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        color: '#0284c7',
                      }}
                    >
                      {companyInfo.stamp.city}
                    </p>
                  </div>
                )}
              </>
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
              {companyInfo.ice && (
                <span>ICE: {companyInfo.ice}</span>
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
