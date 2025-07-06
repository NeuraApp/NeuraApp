import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { BarChart3, TrendingUp, Users, Zap, Calendar, Target } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

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

interface UsageData {
  date: string;
  count: number;
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarMetricas();
  }, []);

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

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Insights e Recomendações
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📈 Tendência de Crescimento</h4>
                  <p className="text-sm text-blue-700">
                    Você está gerando {metricas.ideiasEstaSemanana} ideias por semana. 
                    Continue assim para manter a criatividade em alta!
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">⭐ Qualidade</h4>
                  <p className="text-sm text-green-700">
                    Sua taxa de sucesso de {metricas.taxaSucesso.toFixed(1)}% está excelente! 
                    Continue explorando diferentes nichos.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}