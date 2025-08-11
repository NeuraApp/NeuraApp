import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  User, 
  Sparkles, 
  BookMarked, 
  BarChart3, 
  Settings, 
  Brain,
  Target,
  LogOut 
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const menuItems = [
    { 
      name: 'Painel', 
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    { 
      name: 'Minha Conta', 
      path: '/minha-conta',
      icon: <User className="w-5 h-5" />
    },
    { 
      name: 'Perfil NEURA', 
      path: '/perfil-neura',
      icon: <Brain className="w-5 h-5" />
    },
    { 
      name: 'Gerador de Ideias', 
      path: '/ideia-viral',
      icon: <Sparkles className="w-5 h-5" />
    },
    { 
      name: 'Ideias Salvas', 
      path: '/ideias-salvas',
      icon: <BookMarked className="w-5 h-5" />
    },
    { 
      name: 'Campanhas', 
      path: '/campanhas',
      icon: <Target className="w-5 h-5" />
    },
    { 
      name: 'Analytics', 
      path: '/analytics',
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      name: 'Preferências', 
      path: '/preferencias',
      icon: <Settings className="w-5 h-5" />
    },
    { 
      name: 'Database', 
      path: '/admin/database',
      icon: <Database className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md hidden md:block">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-400">NEURA</h1>
          <ThemeSwitcher />
        </div>
        <nav className="flex flex-col p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 mt-4 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </nav>
      </aside>

      {/* Mobile Menu */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <nav className="flex justify-around p-2">
          {menuItems.slice(0, 4).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 ${
                location.pathname === item.path
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto pb-20 md:pb-8 dark:bg-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}