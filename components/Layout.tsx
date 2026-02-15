'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  Users, 
  FolderKanban, 
  Calendar, 
  FileText, 
  LogOut,
  Menu,
  X,
  UserPlus,
  Bell,
  MessageSquare,
  X as XIcon,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newClientNotification, setNewClientNotification] = useState<Client | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  const menuItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: Home },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/projets', label: 'Projets', icon: FolderKanban },
    { href: '/commandes', label: 'Commandes', icon: ShoppingCart },
    { href: '/planning', label: 'Planning', icon: Calendar },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/plombiers', label: 'Plombiers', icon: Users },
    { href: '/recrutements', label: 'Candidatures', icon: UserPlus },
    { href: '/messages-automatiques', label: 'Messages', icon: MessageSquare },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Rediriger les plombiers vers leur espace (éviter accès admin)
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/espace-plombier/dashboard');
    }
  }, [authLoading, user, router]);

  // Écouter les nouveaux clients créés via formulaire
  useEffect(() => {
    if (authLoading || !user) return;

    // Écouter les 10 derniers clients créés (pour filtrer côté client)
    const clientsQuery = query(
      collection(db, 'clients'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const clientData = change.doc.data();
          
          // Filtrer uniquement les clients créés via formulaire
          if (clientData.source !== 'form') return;

          const client = {
            id: change.doc.id,
            ...clientData,
            createdAt: clientData.createdAt?.toDate() || new Date(),
            updatedAt: clientData.updatedAt?.toDate() || new Date(),
          } as Client;

          // Vérifier si la notification n'a pas déjà été fermée
          if (!dismissedNotifications.has(client.id)) {
            // Vérifier si le client a été créé récemment (dans les 5 dernières minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (client.createdAt > fiveMinutesAgo) {
              setNewClientNotification(client);
            }
          }
        }
      });
    }, (error) => {
      console.error('Error listening to clients:', error);
    });

    return () => unsubscribe();
  }, [user, authLoading, dismissedNotifications]);

  const handleDismissNotification = () => {
    if (newClientNotification) {
      setDismissedNotifications(prev => new Set([...prev, newClientNotification.id]));
      setNewClientNotification(null);
    }
  };

  const handleViewClient = () => {
    if (newClientNotification) {
      router.push(`/clients/${newClientNotification.id}`);
      handleDismissNotification();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center flex-1 min-w-0">
          <Image
            src="/logo.png"
            alt="CRM Plomberie"
            width={120}
            height={40}
            className="h-7 sm:h-8 w-auto object-contain max-w-[100px] sm:max-w-[120px]"
            priority
          />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 flex-shrink-0 ml-2"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar fixe - non scrollable */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-gray-100 shadow-sm transform transition-transform duration-300 ease-in-out',
            'lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo - zone fixe */}
          <div className="flex-shrink-0 p-5 border-b border-gray-100 hidden lg:block">
            <div className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="CRM Plomberie"
                width={160}
                height={53}
                className="h-auto w-full max-w-[180px] object-contain"
                priority
              />
            </div>
          </div>

          {/* Navigation - scrollable si beaucoup d'items */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-0.5 min-h-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 text-primary-700 [&_svg]:text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 [&_svg]:text-gray-400'
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bloc utilisateur - zone fixe en bas, hauteur réservée pour éviter le décalage au chargement */}
          <div className="flex-shrink-0 p-4 pt-3 border-t border-gray-100 bg-gray-50/50">
            <div className="min-h-[88px]">
              {authLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-16 mt-2" />
                  <div className="h-9 bg-gray-200 rounded-lg mt-3" />
                </div>
              ) : (
                <div className="animate-fade-in">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || '—'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email || '—'}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-md bg-primary-100 text-primary-700 border border-primary-200/50">
                    Admin
                  </span>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 mt-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content - marge pour sidebar fixe sur desktop */}
        <main className="flex-1 min-h-screen w-full lg:ml-64">
          {/* Notification pour nouveau client */}
          {newClientNotification && (
            <div className="sticky top-0 z-50 px-2 sm:px-4 lg:px-8 pt-2 sm:pt-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-3 sm:p-4 flex items-center justify-between animate-slide-down">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold">Nouveau client ajouté !</p>
                    <p className="text-xs sm:text-sm text-blue-100 truncate">
                      {newClientNotification.name} - {newClientNotification.phone}
                      {newClientNotification.city && ` • ${newClientNotification.city}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  <button
                    onClick={handleViewClient}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-blue-600 rounded-md text-xs sm:text-sm font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    Voir
                  </button>
                  <button
                    onClick={handleDismissNotification}
                    className="p-1 sm:p-1.5 hover:bg-blue-700 rounded-md transition-colors"
                    aria-label="Fermer"
                  >
                    <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="p-0 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
