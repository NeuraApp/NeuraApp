import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { BarChart3, TrendingUp, Users, Zap, Calendar, Target, Youtube, Music, Instagram, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import type { ContentAnalytics, ContentInsights } from '@/types/content';

interface Metricas {
  totalIdeias: number;
  ideiasHoje: number;
  ideiasEstaSemanana: number;
  taxaSucesso: number;
  tempoMedio: number;
  ideiasPopulares: Array<{
    conteudo: string;
    created_at: string;
    favorito: boolean;
  }>;
  usoMensal: {
    labels: string[];
    data: number[];
  };
}

interface SocialConnection {
  platform: string;
  platform_username: string;
  last_sync_at: string;
  is_expired: boolean;
}

const PLATFORM_ICONS = {
  youtube: Youtube,
  tiktok: Music,
  instagram: Instagram
};

export default function Analytics() {
  const { subscription, isActive, isPro } = useSubscription();
  const [metricas, setMetricas] = useState<Metricas>({
    totalIdeias: 0,
    ideiasHoje: 0,
    ideiasEstaSemanana: 0,
    taxaSucesso: 0,
    tempoMedio: 0,
    ideiasPopulares: [],
    usoMensal: { labels: [], data: [] }
  });
  const [contentAnalytics, setContentAnalytics] = useState<ContentAnalytics[]>([]);
  const [insights, setInsights] = useState<ContentInsights | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarMetricas();
    if (isPro) {
      carregarAnalyticsAvancado();
      carregarConexoes();
    }
  }, [isPro]);

  const carregarMetricas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const semanaAtras = new Date();
      semanaAtras.setDate(hoje.getDate() - 7);

      // Total de ideias
      const { count: totalIdeias } = await supabase
        .from('ideias_virais')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Ideias geradas hoje
      const { count: ideiasHoje } = await supabase
        .from('ideias_virais')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', hoje.toISOString());

      // Ideias desta semana
      const { count: ideiasEstaSemanana } = await supabase
        .from('ideias_virais')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', semanaAtras.toISOString());

      // Taxa de sucesso (logs)
      const { data: logs } = await supabase
        .from('logs')
        .select('success')
        .eq('user_id', user.id)
        .eq('event', 'idea_generated');

      const sucessos = logs?.filter(log => log.success).length || 0;
      const total = logs?.length || 1;
      const taxaSucesso = (sucessos / total) * 100;

      // Ideias populares (favoritas)
      const { data: ideiasPopulares } = await supabase
        .from('ideias_virais')
        .select('conteudo, created_at, favorito')
        .eq('user_id', user.id)
        .eq('favorito', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Uso mensal (últimos 30 dias)
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(hoje.getDate() - 30);

      const { data: usoData } = await supabase
        .from('ideias_virais')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', trintaDiasAtras.toISOString())
        .order('created_at', { ascending: true });

      // Processar dados de uso mensal
      const usageCounts: { [key: string]: number } = {};
      usoData?.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('pt-BR');
        usageCounts[date] = (usageCounts[date] || 0) + 1;
      });

      const labels = Object.keys(usageCounts).slice(-7); // Últimos 7 dias
      const data = labels.map(label => usageCounts[label] || 0);

      setMetricas({
        totalIdeias: totalIdeias || 0,
        ideiasHoje: ideiasHoje || 0,
        ideiasEstaSemanana: ideiasEstaSemanana || 0,
        taxaSucesso,
        tempoMedio: 2.5, // Valor mockado
        ideiasPopulares: ideiasPopulares || [],
        usoMensal: { labels, data }
      });
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  const carregarAnalyticsAvancado = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar dados da view consolidada
      const { data: analyticsData } = await supabase
        .from('content_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setContentAnalytics(analyticsData || []);

      // Carregar insights
      const { data: insightsData } = await supabase
        .rpc('get_user_content_insights', { user_uuid: user.id });

      if (insightsData && insightsData.length > 0) {
        setInsights(insightsData[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar analytics avançado:', err);
    }
  };

  const carregarConexoes = async () => {
    try {
      const { data } = await supabase.rpc('get_active_connections');
      setConnections(data || []);
    } catch (err) {
      console.error('Erro ao carregar conexões:', err);
    }
  };

  const cards = [
    {
      title: 'Total de Ideias',
      value: metricas.totalIdeias,
      icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
      description: 'Ideias geradas até agora',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Ideias Hoje',
      value: metricas.ideiasHoje,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      description: 'Geradas nas últimas 24h',
      change: '+5%',
      changeType: 'positive' as const
    },
    {
      title: 'Esta Semana',
      value: metricas.ideiasEstaSemanana,
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      description: 'Últimos 7 dias',
      change: '+8%',
      changeType: 'positive' as const
    },
    {
      title: 'Taxa de Sucesso',
      value: `${metricas.taxaSucesso.toFixed(1)}%`,
      icon: <Target className="w-6 h-6 text-yellow-600" />,
      description: 'Ideias geradas com sucesso',
      change: '+2%',
      changeType: 'positive' as const
    }
  ];

  if (!isPro && isActive) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Analytics Avançado
            </h2>
            <p className="text-gray-600 mb-6">
              Desbloqueie insights detalhados sobre suas ideias e performance com o plano Pro.
            </p>
            <button
              onClick={() => window.location.href = '/pricing'}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Fazer Upgrade para Pro
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          {isPro && (
            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Carregando métricas...</p>
          </div>
        ) : (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
                    {card.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-2">
                    {card.value}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{card.description}</p>
                    <span className={`text-sm font-medium ${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status das Conexões */}
            {isPro && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Status das Conexões Sociais
                </h3>
                {connections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {connections.map((connection, index) => {
                      const Icon = PLATFORM_ICONS[connection.platform as keyof typeof PLATFORM_ICONS];
                      const lastSync = new Date(connection.last_sync_at);
                      const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {Icon && <Icon className="w-5 h-5" />}
                            <span className="font-medium capitalize">{connection.platform}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {connection.platform_username}
                          </p>
                          <p className="text-xs text-gray-500">
                            Última sincronização: {daysSinceSync === 0 ? 'Hoje' : `${daysSinceSync} dias atrás`}
                          </p>
                          {connection.is_expired && (
                            <p className="text-xs text-red-500 mt-1">Token expirado</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Nenhuma conta conectada</p>
                    <button
                      onClick={() => window.location.href = '/minha-conta'}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Conectar contas sociais
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Insights Personalizados */}
            {isPro && insights && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Insights Personalizados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">🎯 Melhor Categoria</h4>
                    <p className="text-sm text-green-700">
                      {insights.best_categoria || 'Dados insuficientes'}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">📱 Melhor Formato</h4>
                    <p className="text-sm text-blue-700">
                      {insights.best_formato || 'Dados insuficientes'}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">🚀 Melhor Plataforma</h4>
                    <p className="text-sm text-purple-700">
                      {insights.best_plataforma || 'Dados insuficientes'}
                    </p>
                  </div>
                </div>
                {insights.avg_performance_score && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">📊 Score Médio de Performance</h4>
                    <p className="text-2xl font-bold text-gray-800">
                      {insights.avg_performance_score.toFixed(1)}/10
                    </p>
                    <p className="text-sm text-gray-600">
                      Baseado em {insights.total_content_pieces} conteúdos analisados
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Performance Detalhada */}
            {isPro && contentAnalytics.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Performance Detalhada
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Conteúdo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Categoria
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Formato
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Plataforma
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Views
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Likes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contentAnalytics.slice(0, 10).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate">
                              {item.conteudo.length > 50 
                                ? `${item.conteudo.substring(0, 50)}...` 
                                : item.conteudo}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded-full">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {item.formato}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              {item.plataforma_alvo}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.views ? item.views.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.likes ? item.likes.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.performance_score ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                item.performance_score >= 7 
                                  ? 'bg-green-100 text-green-800'
                                  : item.performance_score >= 4
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.performance_score.toFixed(1)}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gráfico de Uso */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Uso nos Últimos 7 Dias
                </h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {metricas.usoMensal.data.map((value, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="bg-purple-600 rounded-t w-full min-h-[4px]"
                        style={{ 
                          height: `${Math.max((value / Math.max(...metricas.usoMensal.data, 1)) * 200, 4)}px` 
                        }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                        {metricas.usoMensal.labels[index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Ideias Favoritas
                </h3>
                <div className="space-y-3">
                  {metricas.ideiasPopulares.length > 0 ? (
                    metricas.ideiasPopulares.map((ideia, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {ideia.conteudo.length > 100 
                            ? `${ideia.conteudo.substring(0, 100)}...` 
                            : ideia.conteudo}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(ideia.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nenhuma ideia favoritada ainda
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Call to Action para conectar contas */}
            {isPro && connections.length === 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  🚀 Desbloqueie o Poder dos Dados Reais
                </h3>
                <p className="text-gray-600 mb-4">
                  Conecte suas contas do YouTube e TikTok para começar a coletar dados de performance 
                  e receber insights personalizados sobre seus conteúdos.
                </p>
                <button
                  onClick={() => window.location.href = '/minha-conta'}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  Conectar Contas Sociais
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}