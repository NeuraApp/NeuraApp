import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../hooks/useToast';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Calendar,
  ArrowRight,
  Zap,
  Clock,
  Star,
  Activity,
  Users,
  Brain
} from 'lucide-react';

interface DashboardKPIs {
  ideiasGeradasMes: number;
  campanhasAtivas: number;
  scoreMedioGanchos: number;
}

interface DashboardInsight {
  id: string;
  type: 'trend' | 'performance' | 'recommendation';
  title: string;
  description: string;
  action_text: string;
  action_data: any;
  priority: number;
}

interface CampanhaAtiva {
  id: string;
  objetivo_principal: string;
  status: string;
  total_etapas: number;
  etapas_publicadas: number;
  data_inicio: string;
  data_fim: string;
}

interface AtividadeRecente {
  id: string;
  event: string;
  timestamp: string;
  metadata?: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscription, isActive, isPro } = useSubscription();
  const { success, error } = useToast();
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    ideiasGeradasMes: 0,
    campanhasAtivas: 0,
    scoreMedioGanchos: 0
  });
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [campanhasAtivas, setCampanhasAtivas] = useState<CampanhaAtiva[]>([]);
  const [atividadeRecente, setAtividadeRecente] = useState<AtividadeRecente[]>([]);

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  const carregarDadosDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const metadata = user.user_metadata || {};
      setUserName(metadata.nome || metadata.name || user.email?.split('@')[0] || 'Usuário');

      // Carregar KPIs em paralelo
      await Promise.all([
        carregarKPIs(user.id),
        carregarInsights(),
        carregarCampanhasAtivas(user.id),
        carregarAtividadeRecente(user.id)
      ]);

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const carregarKPIs = async (userId: string) => {
    try {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      // KPI 1: Ideias geradas este mês
      const { count: ideiasCount } = await supabase
        .from('ideias_virais')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', inicioMes.toISOString());

      // KPI 2: Campanhas ativas
      const { count: campanhasCount } = await supabase
        .from('campanhas')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'ativa');

      // KPI 3: Score médio dos ganchos
      const { data: ideiasComGanchos } = await supabase
        .from('ideias_virais')
        .select('ganchos_sugeridos')
        .eq('user_id', userId)
        .not('ganchos_sugeridos', 'eq', '[]')
        .gte('created_at', inicioMes.toISOString());

      let scoreMedio = 0;
      if (ideiasComGanchos && ideiasComGanchos.length > 0) {
        let totalScores = 0;
        let countScores = 0;

        ideiasComGanchos.forEach(ideia => {
          const ganchos = ideia.ganchos_sugeridos || [];
          ganchos.forEach((gancho: any) => {
            if (gancho.potencial_retencao_score) {
              totalScores += gancho.potencial_retencao_score;
              countScores++;
            }
          });
        });

        scoreMedio = countScores > 0 ? totalScores / countScores : 0;
      }

      setKpis({
        ideiasGeradasMes: ideiasCount || 0,
        campanhasAtivas: campanhasCount || 0,
        scoreMedioGanchos: Math.round(scoreMedio)
      });

    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    }
  };

  const carregarInsights = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-dashboard-insights`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    }
  };

  const carregarCampanhasAtivas = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('user_id', userId)
        .in('campanha_status', ['ativa', 'rascunho'])
        .order('created_at', { ascending: false })
        .limit(3);

      setCampanhasAtivas(data || []);
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
    }
  };

  const carregarAtividadeRecente = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('logs')
        .select('event, timestamp, metadata')
        .eq('user_id', userId)
        .eq('success', true)
        .in('event', ['idea_generated', 'campaign_generated', 'youtube_sync_completed', 'tiktok_sync_completed'])
        .order('timestamp', { ascending: false })
        .limit(5);

      setAtividadeRecente(data?.map((item, index) => ({
        id: `activity_${index}`,
        event: item.event,
        timestamp: item.timestamp,
        metadata: item.metadata
      })) || []);
    } catch (err) {
      console.error('Erro ao carregar atividade:', err);
    }
  };

  const handleInsightAction = (insight: DashboardInsight) => {
    switch (insight.type) {
      case 'trend':
        navigate('/ideia-viral', { 
          state: { 
            trendContext: insight.action_data 
          }
        });
        break;
      case 'performance':
        navigate('/ideia-viral', { 
          state: { 
            categoryFilter: insight.action_data.categoria 
          }
        });
        break;
      case 'recommendation':
        if (insight.action_data.action === 'create_campaign') {
          navigate('/campanhas');
        } else {
          navigate('/ideia-viral');
        }
        break;
    }
  };

  const formatarDataRelativa = (timestamp: string) => {
    const agora = new Date();
    const data = new Date(timestamp);
    const diffMs = agora.getTime() - data.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffHoras < 1) return 'Agora há pouco';
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias < 7) return `${diffDias}d atrás`;
    return data.toLocaleDateString('pt-BR');
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'idea_generated': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'campaign_generated': return <Target className="w-4 h-4 text-blue-500" />;
      case 'youtube_sync_completed': return <Activity className="w-4 h-4 text-red-500" />;
      case 'tiktok_sync_completed': return <Activity className="w-4 h-4 text-black" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventText = (event: string, metadata?: any) => {
    switch (event) {
      case 'idea_generated': return 'Nova ideia gerada';
      case 'campaign_generated': return `Campanha criada com ${metadata?.total_etapas || 0} etapas`;
      case 'youtube_sync_completed': return `${metadata?.synced_count || 0} vídeos sincronizados do YouTube`;
      case 'tiktok_sync_completed': return `${metadata?.synced_count || 0} vídeos sincronizados do TikTok`;
      default: return 'Atividade registrada';
    }
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
      <div className="space-y-8">
        {/* Header com Boas-Vindas */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Olá, {userName}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Bem-vindo ao seu painel de comando. Vamos criar conteúdo viral hoje?
            </p>
          </div>
          <Link to="/ideia-viral">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-lg">
              <Sparkles className="w-5 h-5" />
              Gerar Nova Ideia
            </button>
          </Link>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Ideias Este Mês</h3>
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{kpis.ideiasGeradasMes}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isActive ? 'Ilimitadas disponíveis' : '5 por dia no plano Free'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Campanhas Ativas</h3>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{kpis.campanhasAtivas}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Estratégias coordenadas
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Médio Ganchos</h3>
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{kpis.scoreMedioGanchos}/100</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Potencial de retenção
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Insights da NEURA - Widget Principal */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Insights da NEURA
                </h2>
              </div>

              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {insight.description}
                      </p>
                      <button
                        onClick={() => handleInsightAction(insight)}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium text-sm flex items-center gap-1 transition-colors"
                      >
                        {insight.action_text}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Analisando tendências para gerar insights personalizados...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar com Campanhas e Atividade */}
          <div className="space-y-6">
            {/* Campanhas em Andamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Campanhas Ativas
                </h3>
                <Link to="/campanhas" className="text-purple-600 hover:text-purple-800 text-sm">
                  Ver todas
                </Link>
              </div>

              {campanhasAtivas.length > 0 ? (
                <div className="space-y-3">
                  {campanhasAtivas.map((campanha) => (
                    <div key={campanha.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="font-medium text-gray-800 dark:text-white text-sm mb-2">
                        {campanha.objetivo_principal}
                      </h4>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{campanha.etapas_publicadas}/{campanha.total_etapas} etapas</span>
                        <span className={`px-2 py-1 rounded-full ${
                          campanha.campanha_status === 'ativa' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {campanha.campanha_status}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(campanha.etapas_publicadas / campanha.total_etapas) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Nenhuma campanha ativa
                  </p>
                  <Link to="/campanhas">
                    <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                      Criar primeira campanha
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Atividade Recente */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Atividade Recente
              </h3>

              {atividadeRecente.length > 0 ? (
                <div className="space-y-3">
                  {atividadeRecente.map((atividade) => (
                    <div key={atividade.id} className="flex items-start gap-3">
                      <div className="mt-1">
                        {getEventIcon(atividade.event)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-white">
                          {getEventText(atividade.event, atividade.metadata)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatarDataRelativa(atividade.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma atividade recente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action para Upgrade */}
        {!isActive && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  🚀 Desbloqueie Todo o Potencial do NEURA
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Ideias ilimitadas, analytics avançado e insights preditivos com o plano Pro.
                </p>
              </div>
              <Link to="/pricing">
                <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  Fazer Upgrade
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}