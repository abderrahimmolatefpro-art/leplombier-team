'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AutoMessage } from '@/types';
import { Plus, Edit, Trash2, Save, X, Mail, MessageSquare, Clock } from 'lucide-react';

export default function AutoMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AutoMessage | null>(null);
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

    if (user && user.role === 'admin') {
      loadMessages();
    } else if (user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const loadMessages = async () => {
    try {
      const messagesSnapshot = await getDocs(collection(db, 'autoMessages'));
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

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages automatiques</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Gérer les SMS et emails envoyés automatiquement 24h après chaque intervention
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
              <MessageSquare size={18} className="sm:w-5 sm:h-5" />
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

        {/* Messages list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`card ${!message.enabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{message.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        message.type === 'promotion'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {message.type === 'promotion' ? 'Promotion' : 'Avertissement'}
                    </span>
                    {!message.enabled && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        Désactivé
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{message.delayHours}h après</span>
                    </div>
                    {message.smsEnabled && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare size={14} />
                        <span>SMS</span>
                      </div>
                    )}
                    {message.emailEnabled && (
                      <div className="flex items-center space-x-1">
                        <Mail size={14} />
                        <span>Email</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleEnabled(message)}
                    className={`px-3 py-1 text-xs rounded ${
                      message.enabled
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-200 text-green-700 hover:bg-green-300'
                    }`}
                  >
                    {message.enabled ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleEdit(message)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>SMS:</strong> {message.smsContent.substring(0, 100)}
                  {message.smsContent.length > 100 && '...'}
                </p>
                {message.emailEnabled && (
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {message.emailSubject}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500">Aucun message automatique configuré</p>
            <button
              onClick={() => {
                setEditingMessage(null);
                resetForm();
                setShowModal(true);
              }}
              className="btn btn-primary mt-4"
            >
              Créer le premier message
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai d'envoi (heures) *
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
                    Le message sera envoyé X heures après la fin de l'intervention
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenu SMS *
                    </label>
                    <textarea
                      required={formData.smsEnabled}
                      value={formData.smsContent}
                      onChange={(e) => setFormData({ ...formData, smsContent: e.target.value })}
                      placeholder="Ex: leplombier.ma vous offre 10% sur votre prochain commande"
                      rows={3}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contenu Email (HTML) *
                      </label>
                      <textarea
                        required={formData.emailEnabled}
                        value={formData.emailContent}
                        onChange={(e) =>
                          setFormData({ ...formData, emailContent: e.target.value })
                        }
                        placeholder="Contenu HTML de l'email"
                        rows={8}
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
      </div>
    </Layout>
  );
}
