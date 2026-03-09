'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCountry } from '@/contexts/CountryContext';
import Layout from '@/components/Layout';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COUNTRY_CONFIG } from '@/lib/companyConfig';
import { Plus, Trash2, Edit, GripVertical, Download, Save, X } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface TarifItem {
  label: string;
  price: number;
}

interface TarifCategory {
  id: string;
  name: string;
  color: string;
  items: TarifItem[];
  order: number;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORY_COLORS = [
  { label: 'Rouge', value: '#DC2626' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Vert', value: '#16A34A' },
  { label: 'Bleu', value: '#2563EB' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Rose', value: '#DB2777' },
  { label: 'Marron', value: '#92400E' },
  { label: 'Gris', value: '#4B5563' },
];

// Données initiales (pré-remplissage pour MA)
const DEFAULT_CATEGORIES_MA: Omit<TarifCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Installation Chauffe-Eau',
    color: '#DC2626',
    order: 0,
    country: 'MA',
    items: [
      { label: 'Chauffe-eau électrique 30L', price: 250 },
      { label: 'Chauffe-eau électrique 50L', price: 250 },
      { label: 'Chauffe-eau électrique 80L', price: 300 },
      { label: 'Chauffe-eau électrique 100L', price: 400 },
      { label: 'Chauffe-eau à gaz', price: 250 },
      { label: 'Remplacement chauffe-eau', price: 250 },
    ],
  },
  {
    name: 'Débouchage',
    color: '#16A34A',
    order: 1,
    country: 'MA',
    items: [
      { label: 'Débouchage Toilette', price: 400 },
      { label: 'Débouchage Canalisation', price: 400 },
      { label: 'Débouchage Lavabo', price: 200 },
      { label: 'Débouchage Douche', price: 250 },
    ],
  },
  {
    name: 'Dépannage Plomberie',
    color: '#EA580C',
    order: 2,
    country: 'MA',
    items: [
      { label: 'Dépannage Lavabo', price: 150 },
      { label: 'Dépannage Siphon', price: 200 },
      { label: 'Réparation Chasse d\'Eau', price: 200 },
      { label: 'Réparation Fuite Toilette', price: 250 },
    ],
  },
  {
    name: 'Recherche de Fuite',
    color: '#2563EB',
    order: 3,
    country: 'MA',
    items: [
      { label: 'Avec Appareil', price: 700 },
      { label: 'Sans Appareil', price: 400 },
    ],
  },
  {
    name: 'Installation Sanitaire',
    color: '#7C3AED',
    order: 4,
    country: 'MA',
    items: [
      { label: 'Installation Robinet', price: 150 },
      { label: 'Installation Lavabo', price: 300 },
      { label: 'Installation WC', price: 350 },
      { label: 'Installation Machine à Laver', price: 300 },
    ],
  },
];

export default function TarifsPage() {
  const { user, loading: authLoading } = useAuth();
  const { selectedCountry } = useCountry();
  const [categories, setCategories] = useState<TarifCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TarifCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#DC2626',
    items: [{ label: '', price: 0 }] as TarifItem[],
  });

  const country = selectedCountry === 'ALL' ? 'MA' : selectedCountry;
  const currencyLabel = COUNTRY_CONFIG[country]?.currency === 'EUR' ? '€' : 'DH';

  useEffect(() => {
    if (user) loadCategories();
  }, [user, selectedCountry]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const countriesFilter = selectedCountry === 'ALL' ? ['MA', 'ES'] : [selectedCountry];
      const q = query(
        collection(db, 'tarifCategories'),
        where('country', 'in', countriesFilter),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const cats: TarifCategory[] = [];
      snapshot.forEach((d) => {
        cats.push({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
          updatedAt: d.data().updatedAt?.toDate() || new Date(),
        } as TarifCategory);
      });
      setCategories(cats);
    } catch (error) {
      console.error('Erreur chargement tarifs:', error);
    } finally {
      setLoading(false);
    }
  };

  const initWithDefaults = async () => {
    try {
      for (const cat of DEFAULT_CATEGORIES_MA) {
        await addDoc(collection(db, 'tarifCategories'), {
          ...cat,
          country,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      await loadCategories();
    } catch (error) {
      console.error('Erreur initialisation:', error);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length].value,
      items: [{ label: '', price: 0 }],
    });
    setShowModal(true);
  };

  const openEditModal = (cat: TarifCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      color: cat.color,
      items: [...cat.items],
    });
    setShowModal(true);
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { label: '', price: 0 }] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: 'label' | 'price', value: string | number) => {
    const newItems = [...formData.items];
    if (field === 'price') {
      newItems[index] = { ...newItems[index], price: Number(value) };
    } else {
      newItems[index] = { ...newItems[index], label: value as string };
    }
    setFormData({ ...formData, items: newItems });
  };

  const saveCategory = async () => {
    if (!formData.name.trim()) return alert('Nom de catégorie requis');
    const validItems = formData.items.filter((i) => i.label.trim());
    if (validItems.length === 0) return alert('Ajoutez au moins un élément');

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'tarifCategories', editingCategory.id), {
          name: formData.name,
          color: formData.color,
          items: validItems,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, 'tarifCategories'), {
          name: formData.name,
          color: formData.color,
          items: validItems,
          order: categories.length,
          country,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      setShowModal(false);
      await loadCategories();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await deleteDoc(doc(db, 'tarifCategories', id));
      await loadCategories();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // ─── Génération PDF ────────────────────────────────────
  const generatePDF = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const ML = 15;
    const MR = 15;
    const TW = W - ML - MR;
    const colW = (TW - 6) / 2; // 2 colonnes avec gap
    let y = 0;

    // ─── Header ──────────────────────────────────────
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, W, 32, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    const title = country === 'ES' ? 'Tarifas de Fontanería' : 'Tarifs de Plomberie';
    pdf.text(title, W / 2, 16, { align: 'center' });
    pdf.setFontSize(11);
    const site = country === 'ES' ? 'leplombier.es' : 'leplombier.ma';
    pdf.text(site, W / 2, 26, { align: 'center' });

    y = 40;

    // ─── Catégories en 2 colonnes ────────────────────
    const leftCats: TarifCategory[] = [];
    const rightCats: TarifCategory[] = [];
    let leftH = 0;
    let rightH = 0;

    for (const cat of categories) {
      const catH = 10 + cat.items.length * 7 + 4;
      if (leftH <= rightH) {
        leftCats.push(cat);
        leftH += catH + 4;
      } else {
        rightCats.push(cat);
        rightH += catH + 4;
      }
    }

    const drawCategory = (cat: TarifCategory, x: number, startY: number): number => {
      let cy = startY;

      // Header catégorie
      const hex = cat.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      pdf.setFillColor(r, g, b);
      pdf.roundedRect(x, cy, colW, 8, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text(cat.name, x + 4, cy + 5.5);
      cy += 10;

      // Items
      pdf.setFontSize(9);
      for (let i = 0; i < cat.items.length; i++) {
        const item = cat.items[i];
        const bgAlpha = i % 2 === 0;
        if (bgAlpha) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(x, cy, colW, 7, 'F');
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        pdf.text(`• ${item.label}`, x + 3, cy + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(r, g, b);
        const priceText = `${item.price} ${currencyLabel}`;
        pdf.text(priceText, x + colW - 3, cy + 5, { align: 'right' });
        cy += 7;
      }

      return cy + 4;
    };

    // Dessiner colonne gauche
    let leftY = y;
    for (const cat of leftCats) {
      leftY = drawCategory(cat, ML, leftY);
    }

    // Dessiner colonne droite
    let rightY = y;
    for (const cat of rightCats) {
      rightY = drawCategory(cat, ML + colW + 6, rightY);
    }

    // ─── Footer ──────────────────────────────────────
    const footerY = Math.max(leftY, rightY) + 10;
    const actualFooterY = Math.min(footerY, 270);

    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(ML, actualFooterY, TW, 16, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text(site, W / 2, actualFooterY + 7, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const phone = country === 'ES' ? '+34 600 000 000' : '06 71 05 23 71';
    pdf.text(phone, W / 2, actualFooterY + 13, { align: 'center' });

    // Date de génération
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    const dateStr = new Date().toLocaleDateString(country === 'ES' ? 'es-ES' : 'fr-FR');
    pdf.text(`Généré le ${dateStr}`, W / 2, 293, { align: 'center' });

    // Télécharger
    const filename = country === 'ES'
      ? `Tarifas-fontaneria-leplombier.es.pdf`
      : `Tarifs-plomberie-leplombier.ma.pdf`;
    pdf.save(filename);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Liste de prix</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Gérez vos tarifs par catégorie — {country === 'ES' ? 'Espagne' : 'Maroc'} ({currencyLabel})
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={generatePDF}
              disabled={categories.length === 0}
              className="btn btn-secondary flex items-center space-x-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center disabled:opacity-50"
            >
              <Download size={18} className="sm:w-5 sm:h-5" />
              <span>Télécharger PDF</span>
            </button>
            <button
              onClick={openAddModal}
              className="btn btn-primary flex items-center space-x-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
            >
              <Plus size={18} className="sm:w-5 sm:h-5" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="card text-center py-12 sm:py-16">
            <p className="text-gray-500 mb-4">Aucun tarif configuré pour ce pays.</p>
            <button
              onClick={initWithDefaults}
              className="btn btn-primary text-sm sm:text-base"
            >
              Initialiser avec les tarifs par défaut
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="card p-0 overflow-hidden"
                >
                  {/* Header catégorie */}
                  <div
                    className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between"
                    style={{ backgroundColor: cat.color }}
                  >
                    <h3 className="font-bold text-white text-xs sm:text-sm">{cat.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {cat.items.map((item, i) => (
                      <div
                        key={i}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs sm:text-sm text-gray-700">{item.label}</span>
                        <span
                          className="text-xs sm:text-sm font-bold whitespace-nowrap ml-2"
                          style={{ color: cat.color }}
                        >
                          {item.price} {currencyLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton PDF en bas */}
            <div className="text-center pt-2 sm:pt-4">
              <button
                onClick={generatePDF}
                className="btn btn-primary flex items-center space-x-2 mx-auto text-sm sm:text-base"
              >
                <Download size={18} className="sm:w-5 sm:h-5" />
                <span>Télécharger la liste de prix en PDF</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── Modal ajout/édition ──────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Installation Chauffe-Eau"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        formData.color === c.value
                          ? 'border-gray-900 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Éléments ({currencyLabel})
                </label>
                <div className="space-y-2">
                  {formData.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(i, 'label', e.target.value)}
                        className="input flex-1"
                        placeholder="Nom du service"
                      />
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => updateItem(i, 'price', e.target.value)}
                        className="input w-24 text-right"
                        placeholder="Prix"
                        min="0"
                      />
                      <span className="text-sm text-gray-500 w-6">{currencyLabel}</span>
                      <button
                        onClick={() => removeItem(i)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Ajouter un élément
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={saveCategory}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {editingCategory ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
