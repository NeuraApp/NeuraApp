import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useToast } from '@/hooks/useToast';
import { Copy, Zap, TrendingUp, Target } from 'lucide-react';

interface IdeiaGerada {
  conteudo: string;
  categoria: string;
  formato: string;
  plataforma_alvo: string;
  tendencia_utilizada?: string;
  ganchos_sugeridos?: Array<{
    texto_gancho: string;
    potencial_retencao_score: number;
    justificativa: string;
  }>;
}

interface Gancho {
  texto_gancho: string;
  potencial_retencao_score: number;
  justificativa: string;
}

export default function IdeiaViral() {
  const navigate = useNavigate();
  const { success } = useToast();
  const { error, loading, handleAsyncError } = useErrorHandler();
  const [userName, setUserName] = useState<string | null>(null);
  const [ideia, setIdeia] = useState<IdeiaGerada | null>(null);
  const [showHooks, setShowHooks] = useState(false);

  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    await handleAsyncError(async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        navigate('/login');
        return;
      }

      const nome = data.user.user_metadata?.name || data.user.user_metadata?.nome || 'Usuário';
      setUserName(nome);
    }, 'carregar_usuario', {
      customErrorMessage: 'Erro ao carregar dados do usuário'
    });
  };

  const handleLogout = async () => {
    await handleAsyncError(async () => {
      await supabase.auth.signOut();
      navigate('/login');
    }, 'logout', {
      customErrorMessage: 'Erro ao fazer logout'
    });
  };

  const gerarIdeiaComIA = async () => {
    const result = await handleAsyncError(async () => {
      // Usar edge function em vez de chamar API diretamente
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-ideia`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: 'detailed_idea_generation',
          format: 'structured',
          include_hooks: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao gerar ideia`);
      }

      const ideiaGerada = await response.json();

      // Validar se a resposta tem a estrutura esperada
      if (!ideiaGerada.conteudo || !ideiaGerada.categoria) {
        throw new Error('Resposta da IA em formato inválido');
      }

      setIdeia(ideiaGerada);
      
      // Mostrar ganchos se foram gerados
      if (ideiaGerada.ganchos_sugeridos && ideiaGerada.ganchos_sugeridos.length > 0) {
        setShowHooks(true);
      }

      return ideiaGerada;
    }, 'gerar_ideia', {
      customErrorMessage: 'Erro ao gerar ideia. Verifique suas configurações de IA nas Preferências.'
    });

    if (result) {
      success('Ideia gerada com sucesso!');
    }
  };

  const handleCopiar = async (texto: string, tipo: string = 'ideia') => {
    await handleAsyncError(async () => {
      await navigator.clipboard.writeText(texto);
      success(`${tipo} copiada para a área de transferência!`);
    }, 'copiar_texto', {
      customErrorMessage: 'Erro ao copiar texto'
    });
  };

  const getBestHook = (ganchos: Gancho[]): Gancho | null => {
    if (!ganchos || ganchos.length === 0) return null;
    return ganchos.reduce((best, current) => 
      current.potencial_retencao_score > best.potencial_retencao_score ? current : best
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Olá, {userName} 👋</h1>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 transition"
          >
            Sair
          </button>
        </div>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Gerador de Ideias Virais com IA</h2>
          <p className="text-gray-700 mb-4">
            Use inteligência artificial para gerar ideias criativas e virais para suas redes sociais
          </p>

          {error && (
            <ErrorMessage 
              error={error} 
              onRetry={gerarIdeiaComIA}
              className="mb-4"
            />
          )}

          {ideia && (
            <div className="space-y-6">
              {/* Ideia Principal */}
              <div className="bg-gray-50 p-4 rounded-md border border-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-purple-700">💡 Sua Ideia Viral</h3>
                  <button
                    onClick={() => handleCopiar(ideia.conteudo, 'Ideia')}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
                
                <p className="text-gray-700">{ideia.conteudo}</p>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {ideia.categoria}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {ideia.formato}
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                    {ideia.plataforma_alvo}
                  </span>
                </div>

                {ideia.tendencia_utilizada && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                      Tendência: {ideia.tendencia_utilizada}
                    </span>
                  </div>
                )}
              </div>

              {/* Ganchos A/B */}
              {showHooks && ideia.ganchos_sugeridos && ideia.ganchos_sugeridos.length > 0 && (
                <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">🔥 Otimize seu Gancho</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Escolha o melhor gancho para os primeiros 3 segundos do seu conteúdo:
                  </p>

                  <div className="grid gap-4">
                    {ideia.ganchos_sugeridos.map((gancho, index) => {
                      const isBest = getBestHook(ideia.ganchos_sugeridos!)?.texto_gancho === gancho.texto_gancho;
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isBest 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">
                                Gancho {index + 1}
                              </span>
                              {isBest && (
                                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  Recomendado
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold px-2 py-1 rounded border ${getScoreColor(gancho.potencial_retencao_score)}`}>
                                {gancho.potencial_retencao_score}/100
                              </span>
                              <button
                                onClick={() => handleCopiar(gancho.texto_gancho, 'Gancho')}
                                className="text-purple-600 hover:text-purple-800 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-gray-800 font-medium mb-2">
                            "{gancho.texto_gancho}"
                          </p>
                          
                          <p className="text-sm text-gray-600">
                            💡 {gancho.justificativa}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={gerarIdeiaComIA}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Gerando ideia...
              </>
            ) : (
              'Gerar nova ideia'
            )}
          </button>
        </section>
      </div>
    </Layout>
  );
}