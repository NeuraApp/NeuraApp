import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../hooks/useToast';
import { 
  Sparkles, 
  Zap, 
  TrendingUp, 
  Target,
  Instagram,
  Youtube,
  Music,
  Twitter,
  Linkedin,
  Video,
  List,
  MessageCircle,
  Play,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Copy,
  Star,
  Clock,
  BarChart3
} from 'lucide-react';

interface IdeiaGerada {
  id?: string;
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
  created_at?: string;
}

const PLATAFORMAS = [
  { id: 'Instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  { id: 'TikTok', name: 'TikTok', icon: Music, color: 'text-black' },
  { id: 'YouTube', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
  { id: 'LinkedIn', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  { id: 'Twitter', name: 'Twitter', icon: Twitter, color: 'text-blue-400' }
];

const FORMATOS = [
  { id: 'Tutorial', name: 'Tutorial', icon: BookOpen, description: 'Ensine algo passo a passo' },
  { id: 'POV', name: 'POV', icon: MessageCircle, description: 'Point of view / Perspectiva' },
  { id: 'Lista', name: 'Lista', icon: List, description: 'Top 5, dicas, etc.' },
  { id: 'Reação', name: 'Reação', icon: Play, description: 'Reaja a algo viral' },
  { id: 'Desafio', name: 'Desafio', icon: Target, description: 'Challenge ou trend' },
  { id: 'Pergunta', name: 'Pergunta', icon: HelpCircle, description: 'Engaje com perguntas' }
];

export default function IdeiaViral() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, isActive, isPro } = useSubscription();
  const { success, error } = useToast();
  
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [temaUsuario, setTemaUsuario] = useState<string>('');
  const [plataformaSelecionada, setPlataformaSelecionada] = useState<string>('');
  const [formatoSelecionado, setFormatoSelecionado] = useState<string>('');
  const [ideiasGeradas, setIdeiasGeradas] = useState<IdeiaGerada[]>([]);
  const [historicoSessao, setHistoricoSessao] = useState<IdeiaGerada[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    carregarUsuario();
    
    // Verificar se veio com contexto do dashboard
    if (location.state) {
      const { trendContext, categoryFilter } = location.state;
      if (trendContext) {
        setTemaUsuario(`Criar conteúdo sobre: ${trendContext.trend_name}`);
      }
      if (categoryFilter) {
        // Pré-selecionar filtros baseado no contexto
        console.log('Category filter:', categoryFilter);
      }
    }
  }, [location.state]);

  const carregarUsuario = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/login');
        return;
      }

      const metadata = user.user_metadata || {};
      setUserName(metadata.nome || metadata.name || user.email?.split('@')[0] || 'Usuário');
      
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
      error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleOtimizarEGerar = async () => {
    // Validação básica
    if (!temaUsuario.trim()) {
      error('Por favor, descreva sobre o que você quer criar');
      return;
    }

    setGenerating(true);
    setErrorMessage('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Preparar dados para envio
      const requestBody = {
        context: 'user_optimization',
        user_input: temaUsuario.trim(),
        plataforma_preferida: plataformaSelecionada || null,
        formato_preferido: formatoSelecionado || null,
        include_hooks: true // Sempre incluir ganchos para otimização
      };

      console.log('🎯 Gerando ideia otimizada:', {
        tema: temaUsuario,
        plataforma: plataformaSelecionada,
        formato: formatoSelecionado
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-ideia`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao gerar ideia`);
      }

      const ideiaGerada = await response.json();
      
      // Validar resposta
      if (!ideiaGerada.conteudo) {
        throw new Error('Resposta inválida da IA');
      }

      // Adicionar timestamp para o histórico
      const ideiaComTimestamp = {
        ...ideiaGerada,
        created_at: new Date().toISOString()
      };

      // Atualizar estados
      setIdeiasGeradas(prev => [ideiaComTimestamp, ...prev]);
      setHistoricoSessao(prev => [ideiaComTimestamp, ...prev.slice(0, 4)]); // Manter apenas 5 no histórico
      
      success('Ideia otimizada gerada com sucesso!');
      
      console.log('✅ Ideia gerada:', ideiaGerada);
      
    } catch (err) {
      console.error('Erro ao gerar ideia:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar ideia';
      setErrorMessage(errorMsg);
      error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleMeSurpreenda = () => {
    console.log('Me Surpreenda clicked');
    console.log('Buscar tendência viral');
    // Lógica será implementada na próxima etapa
  };

  const handleCopiarIdeia = (conteudo: string) => {
    navigator.clipboard.writeText(conteudo);
    success('Ideia copiada para a área de transferência!');
  };

  const formatarDataRelativa = (timestamp: string) => {
    const agora = new Date();
    const data = new Date(timestamp);
    const diffMs = agora.getTime() - data.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `${diffMinutos}min atrás`;
    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    return data.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Gerador de Ideias Virais
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Olá, {userName}! Vamos criar conteúdo que engaja e converte?
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Cérebro de Geração */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cérebro de Geração Central */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Cérebro de Geração
                </h2>
              </div>

              {/* Campo de Texto Principal */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sobre o que você quer criar hoje?
                </label>
                <textarea
                  value={temaUsuario}
                  onChange={(e) => setTemaUsuario(e.target.value)}
                  className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Descreva seu tema ou ideia aqui... Ex: 'Como fazer pão de queijo fit', 'Dicas de investimento para iniciantes', 'Tutorial de maquiagem natural'"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleOtimizarEGerar}
                  disabled={generating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      Otimizar e Gerar Ideias
                    </>
                  )}
                </button>

                <button
                  onClick={handleMeSurpreenda}
                  disabled={generating}
                  className="flex-1 bg-white dark:bg-gray-700 border-2 border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-600 font-semibold px-6 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  ✨ Me Surpreenda (Buscar Tendência Viral)
                </button>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Seção de Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Refine sua Busca
              </h3>

              {/* Filtro de Plataforma */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Plataforma Alvo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {PLATAFORMAS.map((plataforma) => {
                    const Icon = plataforma.icon;
                    const isSelected = plataformaSelecionada === plataforma.id;
                    
                    return (
                      <button
                        key={plataforma.id}
                        onClick={() => setPlataformaSelecionada(isSelected ? '' : plataforma.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : plataforma.color}`} />
                        <span className={`text-xs font-medium ${
                          isSelected ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {plataforma.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro de Formato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Formato de Conteúdo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FORMATOS.map((formato) => {
                    const Icon = formato.icon;
                    const isSelected = formatoSelecionado === formato.id;
                    
                    return (
                      <button
                        key={formato.id}
                        onClick={() => setFormatoSelecionado(isSelected ? '' : formato.id)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'}`} />
                          <span className={`font-medium ${
                            isSelected ? 'text-purple-600' : 'text-gray-800 dark:text-white'
                          }`}>
                            {formato.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formato.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Área de Resultados */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Suas Ideias Geniais
              </h3>

              {ideiasGeradas.length > 0 ? (
                <div className="space-y-4">
                  {ideiasGeradas.map((ideia, index) => (
                    <div
                      key={ideia.id || index}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                            {ideia.categoria}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                            {ideia.formato}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                            {ideia.plataforma_alvo}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopiarIdeia(ideia.conteudo)}
                          className="text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-gray-800 dark:text-white mb-2">
                        {ideia.conteudo}
                      </p>
                      
                      {ideia.tendencia_utilizada && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <TrendingUp className="w-4 h-4" />
                          <span>Tendência: {ideia.tendencia_utilizada}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                    Suas ideias geniais aparecerão aqui
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    Digite um tema acima e clique em um dos botões para começar a gerar ideias incríveis!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Histórico da Sessão */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico da Sessão
              </h3>

              {historicoSessao.length > 0 ? (
                <div className="space-y-3">
                  {historicoSessao.slice(0, 5).map((ideia, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleCopiarIdeia(ideia.conteudo)}
                    >
                      <p className="text-sm text-gray-800 dark:text-white line-clamp-2 mb-2">
                        {ideia.conteudo.length > 80 
                          ? `${ideia.conteudo.substring(0, 80)}...` 
                          : ideia.conteudo}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {ideia.categoria}
                        </span>
                        {ideia.created_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatarDataRelativa(ideia.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Suas ideias desta sessão aparecerão aqui
                  </p>
                </div>
              )}
            </div>

            {/* Dicas Rápidas */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Dicas Pro
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  Seja específico no seu tema para ideias mais direcionadas
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  Use "Me Surpreenda\" para descobrir tendências emergentes
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  Combine diferentes formatos para variar seu conteúdo
                </li>
              </ul>
            </div>

            {/* Call to Action para Upgrade */}
            {!isActive && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">
                  🚀 Desbloqueie o Poder Total
                </h4>
                <p className="text-sm text-purple-100 mb-4">
                  Ganchos A/B testados, insights preditivos e ideias ilimitadas com o Pro.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fazer Upgrade
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}