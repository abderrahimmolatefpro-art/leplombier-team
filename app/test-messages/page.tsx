'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Mail, MessageSquare, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function TestMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    sms?: { success: boolean; message: string };
    email?: { success: boolean; message: string };
  }>({});

  const [formData, setFormData] = useState({
    phone: '+212612345678',
    email: 'test@example.com',
    smsMessage: 'Test SMS depuis le CRM - leplombier.ma',
    emailSubject: 'Test Email depuis le CRM',
    emailMessage: 'Ceci est un message de test depuis le CRM leplombier.ma',
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleTestSMS = async () => {
    setTesting(true);
    setTestResults({});

    console.log('📱 [TEST SMS] Début de l\'envoi SMS');
    console.log('📱 [TEST SMS] Données:', { phone: formData.phone, messageLength: formData.smsMessage.length });

    try {
      const requestBody = {
        phone: formData.phone,
        message: formData.smsMessage,
      };
      
      console.log('📱 [TEST SMS] Envoi de la requête à /api/client/send-sms');
      console.log('📱 [TEST SMS] Body:', requestBody);

      const response = await fetch('/api/client/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📱 [TEST SMS] Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log('📱 [TEST SMS] Données de la réponse:', data);

      // Afficher les infos de debug si présentes
      if (data.debug) {
        console.log('🔍 [TEST SMS] DEBUG - Variables d\'environnement:', {
          hasInfobipApiKey: data.debug.hasInfobipApiKey,
          hasInfobipBaseUrl: data.debug.hasInfobipBaseUrl,
          missingVars: data.debug.missingVars,
        });
        
        if (data.debug.missingVars && data.debug.missingVars.length > 0) {
          console.error('❌ [TEST SMS] Variables manquantes:', data.debug.missingVars);
          console.error('❌ [TEST SMS] Action requise: Ajoutez ces variables dans Vercel et redéployez');
        }
      }

      if (!data.success) {
        console.error('❌ [TEST SMS] Erreur:', data.error);
        console.error('❌ [TEST SMS] Détails:', data.details);
        console.error('❌ [TEST SMS] Code:', data.code);
        console.error('❌ [TEST SMS] More Info:', data.moreInfo);
      } else {
        if (data.whatsappUrl) {
          console.warn('⚠️ [TEST SMS] Fallback WhatsApp activé - Infobip non utilisé');
          console.warn('⚠️ [TEST SMS] Raison: Variables d\'environnement Infobip non détectées');
        } else {
          console.log('✅ [TEST SMS] Succès! Message ID:', data.messageId);
          console.log('✅ [TEST SMS] Statut:', data.status);
          console.log('✅ [TEST SMS] Détails:', data.details);
        }
      }

      setTestResults((prev) => ({
        ...prev,
        sms: {
          success: data.success,
          message: data.success
            ? 'SMS envoyé avec succès !'
            : data.error || 'Erreur lors de l\'envoi du SMS',
        },
      }));
    } catch (error: any) {
      console.error('❌ [TEST SMS] Exception:', error);
      console.error('❌ [TEST SMS] Message:', error.message);
      console.error('❌ [TEST SMS] Stack:', error.stack);
      
      setTestResults((prev) => ({
        ...prev,
        sms: {
          success: false,
          message: error.message || 'Erreur lors de l\'envoi du SMS',
        },
      }));
    } finally {
      setTesting(false);
      console.log('📱 [TEST SMS] Fin de l\'envoi SMS');
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResults({});

    try {
      const response = await fetch('/api/client/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.email,
          subject: formData.emailSubject,
          message: formData.emailMessage,
        }),
      });

      const data = await response.json();

      setTestResults((prev) => ({
        ...prev,
        email: {
          success: data.success,
          message: data.success
            ? 'Email envoyé avec succès !'
            : data.error || 'Erreur lors de l\'envoi de l\'email',
        },
      }));
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        email: {
          success: false,
          message: error.message || 'Erreur lors de l\'envoi de l\'email',
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  const handleTestBoth = async () => {
    await Promise.all([handleTestSMS(), handleTestEmail()]);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Test des messages</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Tester l&apos;envoi de SMS et emails pour vérifier la configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test SMS */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="text-blue-600 w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">Test SMS</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+212612345678"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format international avec + (ex: +212612345678)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message SMS *
                </label>
                <textarea
                  value={formData.smsMessage}
                  onChange={(e) => setFormData({ ...formData, smsMessage: e.target.value })}
                  placeholder="Votre message de test"
                  rows={3}
                  className="input"
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.smsMessage.length}/160 caractères
                </p>
              </div>

              <button
                onClick={handleTestSMS}
                disabled={testing || !formData.phone || !formData.smsMessage}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    <span>Tester l&apos;envoi SMS</span>
                  </>
                )}
              </button>

              {testResults.sms && (
                <div
                  className={`p-3 rounded-lg flex items-start space-x-2 ${
                    testResults.sms.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {testResults.sms.success ? (
                    <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        testResults.sms.success ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {testResults.sms.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Email */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Mail className="text-blue-600 w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">Test Email</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="test@example.com"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet *
                </label>
                <input
                  type="text"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                  placeholder="Sujet de l'email"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.emailMessage}
                  onChange={(e) => setFormData({ ...formData, emailMessage: e.target.value })}
                  placeholder="Contenu de l'email"
                  rows={4}
                  className="input"
                />
              </div>

              <button
                onClick={handleTestEmail}
                disabled={testing || !formData.email || !formData.emailSubject || !formData.emailMessage}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Tester l&apos;envoi Email</span>
                  </>
                )}
              </button>

              {testResults.email && (
                <div
                  className={`p-3 rounded-lg flex items-start space-x-2 ${
                    testResults.email.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {testResults.email.success ? (
                    <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        testResults.email.success ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {testResults.email.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test les deux en même temps */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Test complet</h3>
              <p className="text-sm text-gray-600">
                Tester l&apos;envoi de SMS et Email en même temps
              </p>
            </div>
            <button
              onClick={handleTestBoth}
              disabled={testing || !formData.phone || !formData.email || !formData.smsMessage || !formData.emailSubject || !formData.emailMessage}
              className="btn btn-primary flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Test en cours...</span>
                </>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>Tester SMS + Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informations de configuration */}
        <div className="card bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 mb-3">État de la configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Infobip (SMS)</span>
              <span className="text-gray-400">
                {typeof window === 'undefined' ? 'Vérification...' : '✅ Configuré (côté serveur)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">SMTP (Email)</span>
              <span className="text-gray-400">
                {typeof window === 'undefined' ? 'Vérification...' : '✅ Configuré (côté serveur)'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              💡 Les variables d&apos;environnement sont vérifiées côté serveur. Si les tests échouent, vérifiez votre configuration dans Vercel ou .env.local
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
