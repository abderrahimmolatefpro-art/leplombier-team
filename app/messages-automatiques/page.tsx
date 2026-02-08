'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AutoMessage, SentMessage } from '@/types';
import { Plus, Edit, Trash2, Save, X, Mail, MessageSquare, Clock, Search, Filter, BarChart3, Eye, Copy, CheckCircle2, XCircle, Zap } from 'lucide-react';

// Templates pré-remplis
const MESSAGE_TEMPLATES = {
  promotion: {
    name: 'Promotion 10%',
    type: 'promotion' as const,
    smsContent: 'Bonjour {{clientName}}, leplombier.ma vous offre 10% de réduction sur votre prochaine commande. Code: PROMO10. Valable 30 jours.',
    emailSubject: 'Offre spéciale - 10% de réduction sur votre prochaine commande',
    emailContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Offre Spéciale - 10% de Réduction</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Bonjour {{clientName}},</p>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Nous vous remercions pour votre confiance. Pour vous remercier, nous vous offrons <strong style="color: #3B82F6;">10% de réduction</strong> sur votre prochaine commande.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
          <p style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 0;">Code promo: <span style="font-size: 24px;">PROMO10</span></p>
          <p style="color: #6b7280; margin-top: 10px; margin: 0;">Valable 30 jours</p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Contactez-nous au 06 XX XX XX XX ou visitez <a href="https://leplombier.ma" style="color: #3B82F6;">leplombier.ma</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; text-align: center;">
          GROUPE OGINCE - Le Plombier.MA
        </p>
      </div>
    </div>`,
  },
  warning: {
    name: 'Avertissement Garantie',
    type: 'warning' as const,
    smsContent: 'Attention {{clientName}}, chaque intervention faite directement par nos plombiers sans passer par la société vous risquez de perdre votre garantie. Nous ne sommes pas concernés en cas de vol ou comportement inapproprié.',
    emailSubject: 'Important - Information sur votre garantie',
    emailContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Information Importante</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Bonjour {{clientName}},</p>
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; color: #92400E; margin: 0; font-weight: bold; margin-bottom: 10px;">⚠️ Attention importante</p>
          <p style="font-size: 15px; color: #78350F; margin: 0;">
            Chaque intervention faite <strong>directement par nos plombiers sans passer par la société</strong> vous fait <strong>risquer de perdre votre garantie</strong>.
          </p>
        </div>
        <p style="font-size: 15px; color: #333; margin-top: 20px;">
          Nous ne sommes <strong>pas concernés</strong> en cas de :
        </p>
        <ul style="font-size: 15px; color: #333; margin: 15px 0; padding-left: 25px;">
          <li style="margin-bottom: 10px;">Vol</li>
          <li style="margin-bottom: 10px;">Comportement inapproprié</li>
          <li style="margin-bottom: 10px;">Interventions non autorisées</li>
        </ul>
        <p style="font-size: 15px; color: #333; margin-top: 20px;">
          Pour bénéficier de votre garantie, assurez-vous que toutes les interventions passent par notre société.
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Contactez-nous au 06 XX XX XX XX ou visitez <a href="https://leplombier.ma" style="color: #3B82F6;">leplombier.ma</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; text-align: center;">
          GROUPE OGINCE - Le Plombier.MA
        </p>
      </div>
    </div>`,
  },
};

export default function AutoMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ type: 'sms' | 'email'; content: string; subject?: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<AutoMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'promotion' | 'warning'>('all');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'promotion' as 'promotion' | 'warning',
    smsEnabled: true,
    emailEnabled: true,
    smsContent: '',
    emailSubject: '',
    emailContent: '',
    delayHours: 24,
    enabled: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadMessages();
      loadSentMessages();
    }
  }, [user, authLoading, router]);

  const loadMessages = async () => {
    try {
      const messagesSnapshot = await getDocs(query(collection(db, 'autoMessages'), orderBy('createdAt', 'desc')));
      const messagesData = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as AutoMessage[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const loadSentMessages = async () => {
    try {
      const sentSnapshot = await getDocs(query(collection(db, 'sentMessages'), orderBy('sentAt', 'desc')));
      const sentData = sentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as SentMessage[];
      setSentMessages(sentData);
    } catch (error) {
      console.error('Error loading sent messages:', error);
    }
  };

  const getMessageStats = (messageId: string) => {
    const messageSent = sentMessages.filter((m) => m.autoMessageId === messageId);
    const smsSent = messageSent.filter((m) => m.type === 'sms' && m.status === 'sent').length;
    const emailSent = messageSent.filter((m) => m.type === 'email' && m.status === 'sent').length;
    const smsFailed = messageSent.filter((m) => m.type === 'sms' && m.status === 'failed').length;
    const emailFailed = messageSent.filter((m) => m.type === 'email' && m.status === 'failed').length;
    return { smsSent, emailSent, smsFailed, emailFailed, total: messageSent.length };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || (!formData.smsContent && !formData.emailContent)) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const messageData = {
        ...formData,
        createdAt: editingMessage ? editingMessage.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingMessage) {
        await updateDoc(doc(db, 'autoMessages', editingMessage.id), messageData);
      } else {
        await addDoc(collection(db, 'autoMessages'), messageData);
      }

      setShowModal(false);
      setEditingMessage(null);
      resetForm();
      loadMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (message: AutoMessage) => {
    setEditingMessage(message);
    setFormData({
      name: message.name,
      type: message.type,
      smsEnabled: message.smsEnabled,
      emailEnabled: message.emailEnabled,
      smsContent: message.smsContent,
      emailSubject: message.emailSubject,
      emailContent: message.emailContent,
      delayHours: message.delayHours,
      enabled: message.enabled,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      await deleteDoc(doc(db, 'autoMessages', id));
      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleEnabled = async (message: AutoMessage) => {
    try {
      await updateDoc(doc(db, 'autoMessages', message.id), {
        enabled: !message.enabled,
        updatedAt: Timestamp.now(),
      });
      loadMessages();
    } catch (error) {
      console.error('Error toggling message:', error);
      alert('Erreur lors de la modification');
    }
  };

  const handleUseTemplate = (template: typeof MESSAGE_TEMPLATES.promotion | typeof MESSAGE_TEMPLATES.warning) => {
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
      smsContent: template.smsContent,
      emailSubject: template.emailSubject,
      emailContent: template.emailContent,
    });
  };

  const handlePreview = (type: 'sms' | 'email') => {
    const content = type === 'sms' ? formData.smsContent : formData.emailContent;
    const subject = type === 'email' ? formData.emailSubject : undefined;
    // Remplacer les variables par des exemples
    const previewContent = content
      .replace(/\{\{clientName\}\}/g, 'Ahmed Benali')
      .replace(/\{\{projectTitle\}\}/g, 'Réparation salle de bain')
      .replace(/\{\{amount\}\}/g, '1500');
    setPreviewData({ type, content: previewContent, subject });
    setShowPreview(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'promotion',
      smsEnabled: true,
      emailEnabled: true,
      smsContent: '',
      emailSubject: '',
      emailContent: '',
      delayHours: 24,
      enabled: true,
    });
  };

  const filteredMessages = messages.filter((message) => {
    const matchesSearch = message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.smsContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.emailSubject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || message.type === filterType;
    const matchesEnabled = filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && message.enabled) ||
      (filterEnabled === 'disabled' && !message.enabled);
    return matchesSearch && matchesType && matchesEnabled;
  });

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </Layout>
    );
  }

  const totalStats = {
    totalSent: sentMessages.filter((m) => m.status === 'sent').length,
    totalFailed: sentMessages.filter((m) => m.status === 'failed').length,
    smsSent: sentMessages.filter((m) => m.type === 'sms' && m.status === 'sent').length,
    emailSent: sentMessages.filter((m) => m.type === 'email' && m.status === 'sent').length,
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages automatiques</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Gérer les SMS et emails envoyés automatiquement après chaque intervention
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={async () => {
                if (!confirm('Voulez-vous envoyer les messages automatiques maintenant ?')) return;
                try {
                  const response = await fetch('/api/auto-messages/send', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    alert(`Messages envoyés: ${data.sent}, Échecs: ${data.failed || 0}`);
                    loadSentMessages();
                  } else {
                    alert('Erreur: ' + (data.error || 'Erreur inconnue'));
                  }
                } catch (error) {
                  console.error('Error:', error);
                  alert('Erreur lors de l\'envoi des messages');
                }
              }}
              className="btn btn-secondary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Zap size={18} className="sm:w-5 sm:h-5" />
              <span>Envoyer maintenant</span>
            </button>
            <button
              onClick={() => {
                setEditingMessage(null);
                resetForm();
                setShowModal(true);
              }}
              className="btn btn-primary flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Plus size={18} className="sm:w-5 sm:h-5" />
              <span>Nouveau message</span>
            </button>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total envoyés</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalSent}</p>
              </div>
              <CheckCircle2 className="text-green-500" size={24} />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Échecs</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalFailed}</p>
              </div>
              <XCircle className="text-red-500" size={24} />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">SMS envoyés</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.smsSent}</p>
              </div>
              <MessageSquare className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails envoyés</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.emailSent}</p>
              </div>
              <Mail className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="input"
              >
                <option value="all">Tous les types</option>
                <option value="promotion">Promotion</option>
                <option value="warning">Avertissement</option>
              </select>
              <select
                value={filterEnabled}
                onChange={(e) => setFilterEnabled(e.target.value as any)}
                className="input"
              >
                <option value="all">Tous</option>
                <option value="enabled">Actifs</option>
                <option value="disabled">Désactivés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des messages */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nom</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Canal</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Délai</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Statistiques</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {messages.length === 0 ? 'Aucun message automatique configuré' : 'Aucun résultat trouvé'}
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => {
                  const stats = getMessageStats(message.id);
                  return (
                    <tr key={message.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{message.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {message.smsContent.substring(0, 50)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            message.type === 'promotion'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {message.type === 'promotion' ? 'Promotion' : 'Avertissement'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {message.smsEnabled && (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <MessageSquare size={12} />
                              SMS
                            </span>
                          )}
                          {message.emailEnabled && (
                            <span className="flex items-center gap-1 text-xs text-purple-600">
                              <Mail size={12} />
                              Email
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={14} />
                          {message.delayHours}h
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-600">
                          <div>SMS: {stats.smsSent} ✓ {stats.smsFailed} ✗</div>
                          <div>Email: {stats.emailSent} ✓ {stats.emailFailed} ✗</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleEnabled(message)}
                          className={`px-2 py-1 text-xs rounded ${
                            message.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {message.enabled ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(message)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {messages.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">Aucun message automatique configuré</p>
            <button
              onClick={() => {
                setEditingMessage(null);
                resetForm();
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              Créer le premier message
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMessage ? 'Modifier le message' : 'Nouveau message'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingMessage(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Templates rapides */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Templates rapides :</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(MESSAGE_TEMPLATES.promotion)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Copy size={12} className="inline mr-1" />
                      Promotion 10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(MESSAGE_TEMPLATES.warning)}
                      className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      <Copy size={12} className="inline mr-1" />
                      Avertissement Garantie
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 Variables disponibles : <code className="bg-blue-100 px-1 rounded">{'{{clientName}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{projectTitle}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{amount}}'}</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du message *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Promotion 10%, Avertissement garantie"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de message *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as 'promotion' | 'warning' })
                      }
                      className="input"
                    >
                      <option value="promotion">Promotion</option>
                      <option value="warning">Avertissement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai d&apos;envoi (heures) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.delayHours}
                    onChange={(e) =>
                      setFormData({ ...formData, delayHours: parseInt(e.target.value) || 24 })
                    }
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le message sera envoyé X heures après la fin de l&apos;intervention
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.smsEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, smsEnabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Activer SMS</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.emailEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, emailEnabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Activer Email</span>
                  </label>
                </div>

                {formData.smsEnabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Contenu SMS *
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePreview('sms')}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye size={14} />
                        Prévisualiser
                      </button>
                    </div>
                    <textarea
                      required={formData.smsEnabled}
                      value={formData.smsContent}
                      onChange={(e) => setFormData({ ...formData, smsContent: e.target.value })}
                      placeholder="Ex: Bonjour {{clientName}}, leplombier.ma vous offre 10% sur votre prochain commande..."
                      rows={4}
                      className="input"
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.smsContent.length}/160 caractères
                    </p>
                  </div>
                )}

                {formData.emailEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sujet Email *
                      </label>
                      <input
                        type="text"
                        required={formData.emailEnabled}
                        value={formData.emailSubject}
                        onChange={(e) =>
                          setFormData({ ...formData, emailSubject: e.target.value })
                        }
                        placeholder="Ex: Offre spéciale - 10% de réduction"
                        className="input"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Contenu Email (HTML) *
                        </label>
                        <button
                          type="button"
                          onClick={() => handlePreview('email')}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye size={14} />
                          Prévisualiser
                        </button>
                      </div>
                      <textarea
                        required={formData.emailEnabled}
                        value={formData.emailContent}
                        onChange={(e) =>
                          setFormData({ ...formData, emailContent: e.target.value })
                        }
                        placeholder="Contenu HTML de l'email"
                        rows={12}
                        className="input font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded"
                    id="enabled"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                    Activer ce message automatiquement
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMessage(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary flex items-center space-x-2">
                    <Save size={18} />
                    <span>{editingMessage ? 'Modifier' : 'Créer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Prévisualisation */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Prévisualisation</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                {previewData.type === 'sms' ? (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">SMS (160 caractères max)</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{previewData.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {previewData.content.length} caractères
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Email</p>
                    {previewData.subject && (
                      <p className="font-semibold text-gray-900 mb-4">{previewData.subject}</p>
                    )}
                    <div
                      dangerouslySetInnerHTML={{ __html: previewData.content }}
                      className="border border-gray-200 rounded-lg p-4"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
