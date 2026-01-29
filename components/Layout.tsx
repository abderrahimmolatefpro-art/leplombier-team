'use client';

import { useState } from 'react';
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
  FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: Home },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/projets', label: 'Projets', icon: FolderKanban },
    { href: '/planning', label: 'Planning', icon: Calendar },
    { href: '/documents', label: 'Documents', icon: FileText },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="CRM Plomberie"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
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
              
              {isAdmin && (
                <Link
                  href="/test-data"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    pathname === '/test-data'
                      ? 'bg-yellow-50 text-yellow-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <FlaskConical size={20} />
                  <span>Données de test</span>
                </Link>
              )}
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
        <main className="flex-1 lg:ml-0 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
