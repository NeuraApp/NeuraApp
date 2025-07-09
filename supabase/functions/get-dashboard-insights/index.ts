import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface DashboardInsight {
  id: string;
  type: 'trend' | 'performance' | 'recommendation';
  title: string;
  description: string;
  action_text: string;
  action_data: any;
  priority: number;
}

async function getTrendingInsights(userMetadata: any): Promise<DashboardInsight[]> {
  const insights: DashboardInsight[] = [];
  
  try {
    // Buscar tendências emergentes relevantes ao nicho do usuário
    const { data: trends } = await supabase
      .from('tendencias_globais')
      .select('item_nome, categoria_nicho, growth_rate')
      .eq('status', 'emerging')
      .gte('data_coleta', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('growth_rate', { ascending: false })
      .limit(3);

    if (trends && trends.length > 0) {
      trends.forEach((trend, index) => {
        insights.push({
          id: `trend_${index}`,
          type: 'trend',
          title: `🔥 Tendência Emergente: ${trend.item_nome}`,
          description: `Esta tendência está crescendo ${trend.growth_rate.toFixed(1)}% e pode ser perfeita para seu nicho.`,
          action_text: 'Gerar Ideias Sobre Isso',
          action_data: { trend_name: trend.item_nome, category: trend.categoria_nicho },
          priority: 10 - index
        });
      });
    }
  } catch (error) {
    console.error('Error fetching trending insights:', error);
  }

  return insights;
}

async function getPerformanceInsights(userId: string): Promise<DashboardInsight[]> {
  const insights: DashboardInsight[] = [];
  
  try {
    // Analisar performance dos conteúdos do usuário
    const { data: analytics } = await supabase
      .from('content_analytics')
      .select('categoria, formato, plataforma_alvo, performance_score')
      .eq('user_id', userId)
      .not('performance_score', 'is', null)
      .order('performance_score', { ascending: false })
      .limit(10);

    if (analytics && analytics.length > 0) {
      // Encontrar melhor categoria
      const categoryPerformance = analytics.reduce((acc: any, item) => {
        if (!acc[item.categoria]) acc[item.categoria] = [];
        acc[item.categoria].push(item.performance_score);
        return acc;
      }, {});

      const bestCategory = Object.keys(categoryPerformance).reduce((best, category) => {
        const avgScore = categoryPerformance[category].reduce((a: number, b: number) => a + b, 0) / categoryPerformance[category].length;
        return !best || avgScore > categoryPerformance[best].reduce((a: number, b: number) => a + b, 0) / categoryPerformance[best].length ? category : best;
      }, '');

      if (bestCategory) {
        insights.push({
          id: 'performance_category',
          type: 'performance',
          title: `📊 Sua Categoria Campeã: ${bestCategory}`,
          description: 'Seus conteúdos desta categoria têm performance superior. Que tal criar mais?',
          action_text: 'Criar Mais Deste Tipo',
          action_data: { categoria: bestCategory },
          priority: 8
        });
      }
    }
  } catch (error) {
    console.error('Error fetching performance insights:', error);
  }

  return insights;
}

async function getRecommendationInsights(userMetadata: any): Promise<DashboardInsight[]> {
  const insights: DashboardInsight[] = [];
  
  // Recomendações baseadas no perfil do usuário
  if (userMetadata.nicho) {
    insights.push({
      id: 'profile_recommendation',
      type: 'recommendation',
      title: `💡 Oportunidade no ${userMetadata.nicho}`,
      description: 'Baseado no seu perfil, identifiquei uma oportunidade de conteúdo inexplorada.',
      action_text: 'Explorar Oportunidade',
      action_data: { nicho: userMetadata.nicho },
      priority: 6
    });
  }

  // Recomendação de campanha se não tem nenhuma ativa
  insights.push({
    id: 'campaign_suggestion',
    type: 'recommendation',
    title: '🎯 Hora de Planejar uma Campanha',
    description: 'Conteúdos isolados são bons, mas campanhas coordenadas geram resultados exponenciais.',
    action_text: 'Criar Campanha',
    action_data: { action: 'create_campaign' },
    priority: 5
  });

  return insights;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: Missing authorization header');
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    const metadata = user.user_metadata || {};

    // Coletar insights de diferentes fontes
    const [trendingInsights, performanceInsights, recommendationInsights] = await Promise.all([
      getTrendingInsights(metadata),
      getPerformanceInsights(user.id),
      getRecommendationInsights(metadata)
    ]);

    // Combinar e ordenar por prioridade
    const allInsights = [
      ...trendingInsights,
      ...performanceInsights,
      ...recommendationInsights
    ].sort((a, b) => b.priority - a.priority).slice(0, 5); // Máximo 5 insights

    // Log da operação
    await supabase.from('logs').insert({
      event: 'dashboard_insights_generated',
      user_id: user.id,
      success: true,
      metadata: {
        insights_count: allInsights.length,
        insight_types: allInsights.map(i => i.type)
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        insights: allInsights,
        generated_at: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});