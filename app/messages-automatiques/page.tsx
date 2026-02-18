'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AutoMessage, SentMessage, Client } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Plus, Edit, Trash2, Save, X, Mail, MessageSquare, Search, Eye, Copy, CheckCircle2, XCircle, Send, Inbox } from 'lucide-react';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState<AutoMessage | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [sendChannels, setSendChannels] = useState({ sms: true, email: true });
  const [sendClientSearch, setSendClientSearch] = useState('');
  const [sendFilterPhone, setSendFilterPhone] = useState(false);
  const [sendFilterEmail, setSendFilterEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ type: 'sms' | 'email'; content: string; subject?: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<AutoMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'promotion' | 'warning'>('all');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [activeTab, setActiveTab] = useState<'templates' | 'boite-mail'>('templates');
  const [inboxEmails, setInboxEmails] = useState<{ uid: number; subject: string; from: string; fromAddress: string; date: string; seen: boolean }[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [viewEmail, setViewEmail] = useState<{
    uid: number;
    subject: string;
    from: string;
    fromAddress: string;
    to: string;
    date: string;
    text: string;
    html: string;
  } | null>(null);
  const [viewEmailLoading, setViewEmailLoading] = useState(false);
  const prefetchCache = useRef<Map<number, { uid: number; subject: string; from: string; fromAddress: string; to: string; date: string; text: string; html: string }>>(new Map());
  const [formData, setFormData] = useState({
    name: '',
    type: 'promotion' as 'promotion' | 'warning',
    smsEnabled: true,
    emailEnabled: true,
    smsContent: '',
    emailSubject: '',
    emailContent: '',
    enabled: true,
  });

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setInboxError('Session expirée. Rechargez la page.');
        setInboxEmails([]);
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/inbox', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        setInboxError(data.error || 'Erreur lors du chargement');
        setInboxEmails([]);
        return;
      }
      setInboxEmails(data.emails || []);
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Délai dépassé. Vérifiez IMAP_INBOX_* dans .env.local.'
        : 'Erreur de connexion';
      setInboxError(msg);
      setInboxEmails([]);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadMessages();
      loadClients();
      loadSentMessages();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && activeTab === 'boite-mail') loadInbox();
  }, [user, activeTab, loadInbox]);

  const loadClients = async () => {
    try {
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Client[];
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

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
        delayHours: 24,
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
      enabled: message.enabled ?? true,
    });
    setShowModal(true);
  };

  const handleOpenSendModal = (message: AutoMessage) => {
    setSendingMessage(message);
    setSelectedClientIds(new Set());
    setSendChannels({
      sms: Boolean(message.smsEnabled && message.smsContent),
      email: Boolean(message.emailEnabled && message.emailSubject && message.emailContent),
    });
    setSendClientSearch('');
    setSendFilterPhone(false);
    setSendFilterEmail(false);
    setShowSendModal(true);
  };

  const handleSendSubmit = async () => {
    if (!sendingMessage || selectedClientIds.size === 0) return;
    if (!sendChannels.sms && !sendChannels.email) {
      alert('Sélectionnez au moins un canal (SMS ou Email)');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/auto-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: sendingMessage.id,
          clientIds: Array.from(selectedClientIds),
          channels: sendChannels,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Envoi terminé: ${data.sent} message(s) envoyé(s), ${data.failed || 0} échec(s)`);
        setShowSendModal(false);
        setSendingMessage(null);
        loadSentMessages();
      } else {
        alert('Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Error sending:', error);
      alert('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
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
      enabled: true,
    });
  };

  const composeRef = useRef<HTMLDivElement>(null);

  const prefetchEmail = useCallback(async (uid: number) => {
    if (prefetchCache.current.has(uid)) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`/api/inbox/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        prefetchCache.current.set(uid, {
          uid: data.uid,
          subject: data.subject,
          from: data.from,
          fromAddress: data.fromAddress,
          to: data.to || '',
          date: data.date,
          text: data.text || '',
          html: data.html || '',
        });
      }
    } catch {
      // ignore prefetch errors
    }
  }, []);

  const handleViewEmail = useCallback(async (uid: number) => {
    const cached = prefetchCache.current.get(uid);
    if (cached) {
      setViewEmail(cached);
      setViewEmailLoading(false);
      return;
    }
    setViewEmailLoading(true);
    setViewEmail(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/inbox/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erreur lors du chargement');
        return;
      }

      const emailData = {
        uid: data.uid,
        subject: data.subject,
        from: data.from,
        fromAddress: data.fromAddress,
        to: data.to || '',
        date: data.date,
        text: data.text || '',
        html: data.html || '',
      };
      prefetchCache.current.set(uid, emailData);
      setViewEmail(emailData);
    } catch (err) {
      alert('Erreur de connexion');
    } finally {
      setViewEmailLoading(false);
    }
  }, []);

  const handleReply = (email: NonNullable<typeof viewEmail>) => {
    setComposeTo(email.fromAddress);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setComposeMessage(`\n\n---\nLe ${new Date(email.date).toLocaleString('fr-FR')}, ${email.from} a écrit :\n\n${(email.text || '').slice(0, 500)}${email.text && email.text.length > 500 ? '...' : ''}`);
    setViewEmail(null);
    setShowCompose(true);
  };

  const handleComposeSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeMessage.trim()) {
      alert('Destinataire, sujet et message sont requis.');
      return;
    }
    setComposeSending(true);
    try {
      const res = await fetch('/api/client/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo.trim(), subject: composeSubject.trim(), message: composeMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setComposeTo('');
        setComposeSubject('');
        setComposeMessage('');
        alert('Email envoyé avec succès.');
      } else {
        alert('Erreur: ' + (data.error || 'Échec de l\'envoi'));
      }
    } catch (err) {
      alert('Erreur de connexion.');
    } finally {
      setComposeSending(false);
    }
  };

  const filteredClientsForSend = clients.filter((c) => {
    const matchesSearch =
      !sendClientSearch ||
      c.name?.toLowerCase().includes(sendClientSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(sendClientSearch.toLowerCase()) ||
      c.phone?.includes(sendClientSearch);
    const matchesPhone = !sendFilterPhone || (c.phone && c.phone.trim().length > 0);
    const matchesEmail = !sendFilterEmail || (c.email && c.email.trim().length > 0);
    return matchesSearch && matchesPhone && matchesEmail;
  });

  const smsCount = sendingMessage?.smsEnabled && sendChannels.sms
    ? filteredClientsForSend.filter((c) => selectedClientIds.has(c.id) && c.phone).length
    : 0;
  const emailCount = sendingMessage?.emailEnabled && sendChannels.email
    ? filteredClientsForSend.filter((c) => selectedClientIds.has(c.id) && c.email).length
    : 0;
  const previewClient = filteredClientsForSend.find((c) => selectedClientIds.has(c.id)) || filteredClientsForSend[0];

  const filteredMessages = messages.filter((message) => {
    const matchesSearch = message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.smsContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.emailSubject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || message.type === filterType;
    const matchesEnabled = filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && message.enabled !== false) ||
      (filterEnabled === 'disabled' && message.enabled === false);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              {activeTab === 'templates' ? 'Envoyer des SMS et emails à vos clients' : 'Boîte mail contact@leplombier.ma — Envoi et réception'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {activeTab === 'templates' && (
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
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'templates'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={16} />
              Templates
            </span>
          </button>
          <button
            onClick={() => setActiveTab('boite-mail')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'boite-mail'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Mail size={16} />
              Boîte mail
            </span>
          </button>
        </div>

        {/* Boîte mail content - style Gmail */}
        {activeTab === 'boite-mail' && (
          <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 280px)' }}>
            {/* Barre d'outils */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowCompose(true); setViewEmail(null); }}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nouveau
                </button>
                <button
                  onClick={loadInbox}
                  disabled={inboxLoading}
                  className="btn btn-secondary btn-sm"
                >
                  Actualiser
                </button>
              </div>
              <a
                href={process.env.NEXT_PUBLIC_WEBMAIL_URL || 'https://premium239.web-hosting.com:2096/3rdparty/roundcube/'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline"
              >
                Ouvrir le webmail
              </a>
            </div>

            {/* Layout 2 colonnes style Gmail */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Liste des emails */}
              <div className={`border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/50 overflow-hidden flex flex-col ${
                viewEmail || showCompose ? 'md:w-96 flex-shrink-0 max-h-[40vh] md:max-h-none' : 'flex-1'
              }`}>
                {inboxLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                  </div>
                ) : inboxError ? (
                  <div className="p-4">
                    <p className="text-sm text-amber-800">{inboxError}</p>
                    <button type="button" onClick={loadInbox} className="mt-2 btn btn-secondary btn-sm">Réessayer</button>
                  </div>
                ) : inboxEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Inbox size={48} className="mb-4 opacity-50" />
                    <p>Aucun email</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1">
                    {inboxEmails.map((email) => {
                      const initial = (email.from.match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase();
                      const isSelected = viewEmail?.uid === email.uid;
                      return (
                        <div
                          key={email.uid}
                          onMouseEnter={() => prefetchEmail(email.uid)}
                          onClick={() => { handleViewEmail(email.uid); setShowCompose(false); }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                            isSelected ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-gray-100'
                          } ${!email.seen ? 'bg-blue-50/70' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                            !email.seen ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`truncate ${!email.seen ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {email.from.replace(/<[^>]+>/g, '').trim() || email.from}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatDateTime(email.date)}
                              </span>
                            </div>
                            <p className={`text-sm truncate mt-0.5 ${!email.seen ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                              {email.subject}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panneau droit : contenu email ou formulaire */}
              <div className={`flex-1 bg-white overflow-hidden flex flex-col ${!viewEmail && !showCompose ? 'hidden md:flex' : ''}`}>
                {showCompose ? (
                  <div className="flex flex-col h-full overflow-y-auto" ref={composeRef}>
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Nouveau message</h3>
                      <button onClick={() => { setShowCompose(false); setComposeTo(''); setComposeSubject(''); setComposeMessage(''); }} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleComposeSend} className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">À</label>
                        <input
                          type="email"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          placeholder="Destinataire"
                          className="input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sujet</label>
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Sujet"
                          className="input w-full"
                          required
                        />
                      </div>
                      <div>
                        <textarea
                          value={composeMessage}
                          onChange={(e) => setComposeMessage(e.target.value)}
                          placeholder="Message..."
                          className="input w-full min-h-[200px]"
                          required
                        />
                      </div>
                      <button type="submit" disabled={composeSending} className="btn btn-primary">
                        {composeSending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </form>
                  </div>
                ) : viewEmailLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                  </div>
                ) : viewEmail ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                      <h3 className="font-semibold text-gray-900 truncate pr-4">{viewEmail.subject}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleReply(viewEmail)} className="btn btn-primary btn-sm inline-flex items-center gap-1">
                          <Send size={14} /> Répondre
                        </button>
                        <a
                          href={`mailto:${viewEmail.fromAddress}?subject=Re: ${encodeURIComponent(viewEmail.subject)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          Client mail
                        </a>
                        <button onClick={() => setViewEmail(null)} className="btn btn-secondary btn-sm">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-b text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">De :</span> {viewEmail.from}</p>
                      <p><span className="font-medium">Date :</span> {formatDateTime(viewEmail.date)}</p>
                    </div>
                    <div className="px-4 py-4 overflow-y-auto flex-1 text-sm">
                      {viewEmail.html ? (
                        <div className="[&_a]:text-primary-600 [&_a]:underline [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: viewEmail.html }} />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-800">{viewEmail.text || '(Aucun contenu)'}</pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400">
                    <Mail size={64} className="mb-4 opacity-50" />
                    <p>Aucun email sélectionné</p>
                    <p className="text-sm mt-1">Cliquez sur un email pour le lire</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Templates content */}
        {activeTab === 'templates' && (
          <>
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Statistiques</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    {messages.length === 0 ? 'Aucun modèle de message configuré' : 'Aucun résultat trouvé'}
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
                        <div className="text-xs text-gray-600">
                          <div>SMS: {stats.smsSent} ✓ {stats.smsFailed} ✗</div>
                          <div>Email: {stats.emailSent} ✓ {stats.emailFailed} ✗</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleEnabled(message)}
                          className={`px-2 py-1 text-xs rounded ${
                            message.enabled !== false
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {message.enabled !== false ? 'Visible' : 'Masqué'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenSendModal(message)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Envoyer"
                          >
                            <Send size={16} />
                          </button>
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
            <p className="text-gray-500 mb-4">Aucun modèle de message configuré</p>
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
                    Visible dans la liste (décocher pour masquer)
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

        {/* Modal Envoyer le message */}
        {showSendModal && sendingMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Envoyer : {sendingMessage.name}</h2>
                <button
                  onClick={() => {
                    setShowSendModal(false);
                    setSendingMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Recherche et filtres */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={sendClientSearch}
                    onChange={(e) => setSendClientSearch(e.target.value)}
                    className="input w-full"
                  />
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendFilterPhone}
                        onChange={(e) => setSendFilterPhone(e.target.checked)}
                        className="rounded"
                      />
                      Avec téléphone
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendFilterEmail}
                        onChange={(e) => setSendFilterEmail(e.target.checked)}
                        className="rounded"
                      />
                      Avec email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const eligible = filteredClientsForSend.filter((c) => {
                          const canSms = sendChannels.sms && c.phone;
                          const canEmail = sendChannels.email && c.email;
                          return canSms || canEmail;
                        });
                        const eligibleIds = new Set(eligible.map((c) => c.id));
                        if (eligible.length > 0 && selectedClientIds.size === eligibleIds.size) {
                          setSelectedClientIds(new Set());
                        } else {
                          setSelectedClientIds(eligibleIds);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {(() => {
                        const eligible = filteredClientsForSend.filter((c) => {
                          const canSms = sendChannels.sms && c.phone;
                          const canEmail = sendChannels.email && c.email;
                          return canSms || canEmail;
                        });
                        const allSelected = eligible.length > 0 && selectedClientIds.size === eligible.length;
                        return allSelected ? 'Tout désélectionner' : 'Tout sélectionner';
                      })()}
                    </button>
                  </div>
                </div>

                {/* Canaux */}
                <div className="flex gap-4 border-b border-gray-200 pb-4">
                  {sendingMessage.smsEnabled && sendingMessage.smsContent && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendChannels.sms}
                        onChange={(e) => setSendChannels((c) => ({ ...c, sms: e.target.checked }))}
                        className="rounded"
                      />
                      <MessageSquare size={16} />
                      SMS
                    </label>
                  )}
                  {sendingMessage.emailEnabled && sendingMessage.emailSubject && sendingMessage.emailContent && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendChannels.email}
                        onChange={(e) => setSendChannels((c) => ({ ...c, email: e.target.checked }))}
                        className="rounded"
                      />
                      <Mail size={16} />
                      Email
                    </label>
                  )}
                </div>

                {/* Liste clients */}
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredClientsForSend.length === 0 ? (
                    <p className="p-4 text-gray-500 text-sm">Aucun client trouvé</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredClientsForSend.map((c) => {
                        const canSms = sendChannels.sms && c.phone;
                        const canEmail = sendChannels.email && c.email;
                        const selectable = canSms || canEmail;
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-50 ${!selectable ? 'opacity-50' : 'cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedClientIds.has(c.id)}
                              onChange={(e) => {
                                if (!selectable) return;
                                const next = new Set(selectedClientIds);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                setSelectedClientIds(next);
                              }}
                              disabled={!selectable}
                              className="rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900">{c.name}</span>
                              <div className="text-xs text-gray-500 truncate">
                                {c.phone && <span className="mr-2">{c.phone}</span>}
                                {c.email}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Aperçu */}
                {previewClient && (sendChannels.sms || sendChannels.email) && (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="font-medium text-gray-700 mb-2">Aperçu pour {previewClient.name} :</p>
                    {sendChannels.sms && sendingMessage.smsContent && (
                      <div className="mb-2">
                        <span className="text-gray-500">SMS : </span>
                        <span className="text-gray-900">
                          {sendingMessage.smsContent
                            .replace(/\{\{clientName\}\}/g, previewClient.name || 'Client')
                            .replace(/\{\{projectTitle\}\}/g, 'Intervention')
                            .replace(/\{\{amount\}\}/g, '')}
                        </span>
                      </div>
                    )}
                    {sendChannels.email && sendingMessage.emailSubject && (
                      <div>
                        <span className="text-gray-500">Sujet : </span>
                        <span className="text-gray-900">
                          {sendingMessage.emailSubject
                            .replace(/\{\{clientName\}\}/g, previewClient.name || 'Client')
                            .replace(/\{\{projectTitle\}\}/g, 'Intervention')
                            .replace(/\{\{amount\}\}/g, '')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Récap et envoi */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {selectedClientIds.size} client(s) sélectionné(s)
                    {smsCount > 0 && ` • ${smsCount} SMS`}
                    {emailCount > 0 && ` • ${emailCount} email(s)`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSendModal(false);
                        setSendingMessage(null);
                      }}
                      className="btn btn-secondary"
                      disabled={sending}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSendSubmit}
                      disabled={sending || selectedClientIds.size === 0 || (!sendChannels.sms && !sendChannels.email)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {sending ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
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
          </>
        )}
      </div>
    </Layout>
  );
}
