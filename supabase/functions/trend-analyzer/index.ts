import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TrendData {
  item_nome: string;
  fonte: string;
  regiao: string;
  valores: { valor: number; data: string }[];
}

async function getTrendsForAnalysis(): Promise<TrendData[]> {
  // Buscar todas as tendências únicas dos últimos 7 dias
  const { data: trends, error } = await supabase
    .from('tendencias_globais')
    .select('item_nome, fonte, regiao, item_valor, data_coleta')
    .gte('data_coleta', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('item_nome, data_coleta');

  if (error) {
    throw new Error(`Erro ao buscar tendências: ${error.message}`);
  }

  // Agrupar por item_nome, fonte e região
  const groupedTrends: { [key: string]: TrendData } = {};

  for (const trend of trends || []) {
    const key = `${trend.item_nome}|${trend.fonte}|${trend.regiao}`;
    
    if (!groupedTrends[key]) {
      groupedTrends[key] = {
        item_nome: trend.item_nome,
        fonte: trend.fonte,
        regiao: trend.regiao,
        valores: []
      };
    }
    
    groupedTrends[key].valores.push({
      valor: Number(trend.item_valor),
      data: trend.data_coleta
    });
  }

  return Object.values(groupedTrends);
}

function calculateTrendMetrics(valores: { valor: number; data: string }[]) {
  // Ordenar por data (mais recente primeiro)
  const sortedValues = valores.sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  if (sortedValues.length < 2) {
    return {
      velocidade: 0,
      aceleracao: 0,
      status: 'new' as const
    };
  }

  const hoje = sortedValues[0].valor;
  const ontem = sortedValues[1].valor;
  
  // Calcular velocidade (mudança de hoje para ontem)
  const velocidade = hoje - ontem;
  
  let aceleracao = 0;
  
  // Se temos 3 ou mais pontos, calcular aceleração
  if (sortedValues.length >= 3) {
    const anteontem = sortedValues[2].valor;
    const velocidadeAnterior = ontem - anteontem;
    aceleracao = velocidade - velocidadeAnterior;
  }

  // Determinar status baseado na velocidade e aceleração
  let status: 'emerging' | 'peaking' | 'saturated';
  
  if (velocidade > 0 && aceleracao > 0) {
    status = 'emerging'; // Crescendo e acelerando
  } else if (velocidade > 0 && aceleracao <= 0) {
    status = 'peaking'; // Crescendo mas desacelerando
  } else {
    status = 'saturated'; // Em declínio
  }

  return { velocidade, aceleracao, status };
}

async function updateTrendStatus(
  itemNome: string,
  fonte: string,
  regiao: string,
  metrics: { velocidade: number; aceleracao: number; status: string }
): Promise<void> {
  const { error } = await supabase
    .from('tendencias_globais')
    .update({
      status: metrics.status,
      growth_rate: metrics.velocidade
    })
    .eq('item_nome', itemNome)
    .eq('fonte', fonte)
    .eq('regiao', regiao)
    .gte('data_coleta', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

  if (error) {
    console.error(`Erro ao atualizar status da tendência ${itemNome}:`, error);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    console.log('🧠 Iniciando análise preditiva de tendências...');

    // Buscar tendências para análise
    const trendsData = await getTrendsForAnalysis();
    
    console.log(`📈 Analisando ${trendsData.length} tendências únicas`);

    let analyzedCount = 0;
    let emergingCount = 0;
    let peakingCount = 0;
    let saturatedCount = 0;

    // Analisar cada tendência
    for (const trendData of trendsData) {
      try {
        // Calcular métricas de velocidade e aceleração
        const metrics = calculateTrendMetrics(trendData.valores);
        
        // Atualizar status no banco
        await updateTrendStatus(
          trendData.item_nome,
          trendData.fonte,
          trendData.regiao,
          metrics
        );

        analyzedCount++;
        
        // Contar por status
        switch (metrics.status) {
          case 'emerging':
            emergingCount++;
            break;
          case 'peaking':
            peakingCount++;
            break;
          case 'saturated':
            saturatedCount++;
            break;
        }

        console.log(`✅ ${trendData.item_nome}: ${metrics.status} (v: ${metrics.velocidade.toFixed(2)}, a: ${metrics.aceleracao.toFixed(2)})`);
        
      } catch (error) {
        console.error(`Erro ao analisar tendência ${trendData.item_nome}:`, error);
      }
    }

    // Log da execução
    await supabase.from('logs').insert({
      event: 'trend_analysis_completed',
      user_id: null, // Sistema
      success: true,
      metadata: {
        total_analyzed: analyzedCount,
        emerging_trends: emergingCount,
        peaking_trends: peakingCount,
        saturated_trends: saturatedCount,
        analysis_window_days: 7
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'Análise preditiva concluída',
        total_analyzed: analyzedCount,
        results: {
          emerging: emergingCount,
          peaking: peakingCount,
          saturated: saturatedCount
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na análise de tendências:', error);
    
    // Log do erro
    await supabase.from('logs').insert({
      event: 'trend_analysis_failed',
      user_id: null,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        error: 'Erro na análise de tendências',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});