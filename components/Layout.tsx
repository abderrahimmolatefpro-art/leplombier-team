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
  X as XIcon
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

  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: Home },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/projets', label: 'Projets', icon: FolderKanban },
    { href: '/planning', label: 'Planning', icon: Calendar },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/plombiers', label: 'Plombiers', icon: Users },
    ...(isAdmin ? [{ href: '/recrutements', label: 'Candidatures', icon: UserPlus }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 hidden lg:block">
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

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-200">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700">
                  {isAdmin ? 'Admin' : 'Plombier'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0 min-h-screen w-full">
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
