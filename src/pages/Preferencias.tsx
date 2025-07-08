import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { useAdmin } from '../hooks/useAdmin';
import { Navigate } from 'react-router-dom';
import { Sun, Moon, Shield, Settings } from 'lucide-react';

interface SystemPreferences {
  system_prompt: string;
  llm_provider: string;
}

interface UserPreferences {
  tema: 'claro' | 'escuro';
}

export default function Preferencias() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    tema: 'claro'
  });
  const [systemPrefs, setSystemPrefs] = useState<SystemPreferences>({
    system_prompt: '',
    llm_provider: 'gemini-pro'
  });
  const [loading, setLoading] = useState(false);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    carregarPreferencias();
    if (isAdmin) {
      carregarPreferenciasDoSistema();
    }
  }, [isAdmin]);

  const carregarPreferencias = async () => {
    try {
      const temaLocal = localStorage.getItem('tema') as 'claro' | 'escuro';
      const tema = temaLocal || 'claro';
      document.documentElement.classList.toggle('dark', tema === 'escuro');

      setUserPrefs({ tema });
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
      error('Erro ao carregar preferências');
    }
  };

  const carregarPreferenciasDoSistema = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('system_preferences')
        .select('system_prompt, llm_provider')
        .eq('id', 'global_config')
        .single();

      if (fetchError) {
        console.error('Erro ao carregar configurações do sistema:', fetchError);
        error('Erro ao carregar configurações do sistema');
        return;
      }

      setSystemPrefs({
        system_prompt: data.system_prompt || '',
        llm_provider: data.llm_provider || 'gemini-pro'
      });
    } catch (err) {
      console.error('Erro ao carregar configurações do sistema:', err);
      error('Erro ao carregar configurações do sistema');
    } finally {
      setLoadingSystem(false);
    }
  };

  const salvarPreferenciasUsuario = async () => {
    try {
      setLoading(true);

      localStorage.setItem('tema', userPrefs.tema);
      document.documentElement.classList.toggle('dark', userPrefs.tema === 'escuro');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            tema: userPrefs.tema
          }
        });
      }

      success('Preferências salvas com sucesso');
    } catch (err) {
      error('Erro ao salvar preferências');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const salvarPreferenciasDoSistema = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-system-preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_prompt: systemPrefs.system_prompt,
          llm_provider: systemPrefs.llm_provider
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }

      success('Configurações do sistema salvas com sucesso');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao salvar configurações do sistema');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Se ainda está carregando status de admin
  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </Layout>
    );
  }

  // Se não é admin, redirecionar
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Preferências do Sistema</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Acesso restrito a administradores
            </p>
          </div>
        </div>

        {/* Preferências do Usuário */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Preferências Pessoais</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Tema da Interface
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setUserPrefs(prev => ({ ...prev, tema: 'claro' }));
                    document.documentElement.classList.remove('dark');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    userPrefs.tema === 'claro'
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  Claro
                </button>
                <button
                  onClick={() => {
                    setUserPrefs(prev => ({ ...prev, tema: 'escuro' }));
                    document.documentElement.classList.add('dark');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    userPrefs.tema === 'escuro'
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  Escuro
                </button>
              </div>
            </div>

            <LoadingButton
              onClick={salvarPreferenciasUsuario}
              loading={loading}
              className="w-full"
            >
              Salvar Preferências Pessoais
            </LoadingButton>
          </div>
        </section>

        {/* Configurações do Sistema (Admin Only) */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Configurações do Sistema</h2>
          </div>
          
          {loadingSystem ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando configurações...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Provedor de IA
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {systemPrefs.llm_provider} (Google Gemini)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  A chave da API é gerenciada de forma segura no backend
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Prompt do Sistema
                </label>
                <textarea
                  value={systemPrefs.system_prompt}
                  onChange={(e) => setSystemPrefs(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Defina como a IA deve se comportar..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este prompt define o comportamento base da IA para todos os usuários
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Configuração Crítica
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Alterações no prompt do sistema afetam todos os usuários da plataforma. 
                      Teste cuidadosamente antes de salvar.
                    </p>
                  </div>
                </div>
              </div>

              <LoadingButton
                onClick={salvarPreferenciasDoSistema}
                loading={loading}
                className="w-full"
              >
                Salvar Configurações do Sistema
              </LoadingButton>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}