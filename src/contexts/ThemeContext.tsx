import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const { success } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Sincronizar tema com Supabase ao fazer login
  useEffect(() => {
    if (session?.user) {
      const userTheme = session.user.user_metadata?.theme;
      if (userTheme && userTheme !== theme) {
        setTheme(userTheme);
        localStorage.setItem('theme', userTheme);
      }
    }
  }, [session]);

  // Aplicar classe no documento
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      
      // Atualizar estado e localStorage
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);

      // Se usuário estiver logado, atualizar no Supabase
      if (session?.user) {
        const currentMeta = session.user.user_metadata || {};
        if (currentMeta.theme !== newTheme) {
          await supabase.auth.updateUser({
            data: { ...currentMeta, theme: newTheme }
          });
        }
      }

      success(`Tema alterado para ${newTheme === 'light' ? 'claro' : 'escuro'}`);
    } catch (err) {
      console.error('Erro ao alterar tema:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}