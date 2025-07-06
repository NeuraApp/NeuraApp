import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { Sun, Moon } from 'lucide-react';
import type { AIPreferences } from '@/types';

interface Preferencias {
  tema: 'claro' | 'escuro';
  ai: AIPreferences;
}

const defaultAIPreferences: AIPreferences = {
  provider: {
    type: 'openai',
    apiKey: '',
    enabled: false,
    baseUrl: '',
    model: ''
  },
  temperature: 0.7,
  maxTokens: 1000,
  language: 'pt-BR'
};

export default function Preferencias() {
  const [preferencias, setPreferencias] = useState<Preferencias>({
    tema: 'claro',
    ai: defaultAIPreferences
  });
  const [loading, setLoading] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    carregarPreferencias();
  }, []);

  const carregarPreferencias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const temaLocal = localStorage.getItem('tema') as 'claro' | 'escuro';
      const aiPrefs = user.user_metadata?.ai_preferences;

      const tema = temaLocal || 'claro';
      document.documentElement.classList.toggle('dark', tema === 'escuro');

      setPreferencias({
        tema,
        ai: aiPrefs || defaultAIPreferences
      });
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
      error('Erro ao carregar preferências');
    }
  };

  const testarConexaoAI = async () => {
    setTestingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-ai-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(preferencias.ai)
        }
      );

      if (!response.ok) throw new Error('Falha ao testar conexão');
      await response.json();
      success('Conexão com IA testada com sucesso!');
    } catch (err) {
      error('Erro ao testar conexão com IA');
      console.error(err);
    } finally {
      setTestingAI(false);
    }
  };

  const salvarPreferencias = async () => {
    try {
      setLoading(true);

      localStorage.setItem('tema', preferencias.tema);
      document.documentElement.classList.toggle('dark', preferencias.tema === 'escuro');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            ai_preferences: preferencias.ai
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

  const handleAIChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setPreferencias(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        provider: {
          ...prev.ai.provider,
          [name]: value
        }
      }
    }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Preferências</h1>

        {/* Tema */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tema</h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setPreferencias(prev => ({ ...prev, tema: 'claro' }));
                document.documentElement.classList.remove('dark');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                preferencias.tema === 'claro'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Sun className="w-5 h-5" />
              Claro
            </button>
            <button
              onClick={() => {
                setPreferencias(prev => ({ ...prev, tema: 'escuro' }));
                document.documentElement.classList.add('dark');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                preferencias.tema === 'escuro'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Moon className="w-5 h-5" />
              Escuro
            </button>
          </div>
        </section>

        {/* IA */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Configuração de IA</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Provedor de IA
              </label>
              <select
                name="type"
                value={preferencias.ai.provider.type}
                onChange={handleAIChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="openai">OpenAI (GPT-3.5/4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Chave da API
              </label>
              <input
                type="password"
                name="apiKey"
                value={preferencias.ai.provider.apiKey}
                onChange={handleAIChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="sk-..."
              />
            </div>

            {preferencias.ai.provider.type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  URL Base da API
                </label>
                <input
                  type="text"
                  name="baseUrl"
                  value={preferencias.ai.provider.baseUrl || ''}
                  onChange={handleAIChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://api.exemplo.com"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Modelo (opcional)
              </label>
              <input
                type="text"
                name="model"
                value={preferencias.ai.provider.model || ''}
                onChange={handleAIChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="gpt-4-turbo-preview"
              />
            </div>

            <div className="pt-4 flex gap-4">
              <LoadingButton
                onClick={testarConexaoAI}
                loading={testingAI}
                variant="secondary"
                className="flex-1"
              >
                Testar Conexão
              </LoadingButton>

              <LoadingButton
                onClick={salvarPreferencias}
                loading={loading}
                className="flex-1"
              >
                Salvar Configurações
              </LoadingButton>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
