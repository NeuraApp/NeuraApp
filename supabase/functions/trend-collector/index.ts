import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Categorias de nicho para monitoramento
const CATEGORIAS_NICHO = [
  'Marketing Digital',
  'Finanças',
  'Culinária',
  'Fitness',
  'Tecnologia',
  'Educação',
  'Entretenimento',
  'Moda',
  'Viagem',
  'Saúde'
];

// Simular dados do Google Trends (em produção, usar API real)
async function collectGoogleTrends(): Promise<any[]> {
  const trends = [];
  
  // Simular tendências emergentes para diferentes categorias
  const trendingTerms = [
    { termo: 'receita de pão de queijo fit', categoria: 'Culinária', valor: 85 },
    { termo: 'investimento em criptomoedas 2025', categoria: 'Finanças', valor: 92 },
    { termo: 'treino funcional em casa', categoria: 'Fitness', valor: 78 },
    { termo: 'marketing de influência micro', categoria: 'Marketing Digital', valor: 88 },
    { termo: 'inteligência artificial no trabalho', categoria: 'Tecnologia', valor: 95 },
    { termo: 'curso online gratuito', categoria: 'Educação', valor: 82 },
    { termo: 'moda sustentável 2025', categoria: 'Moda', valor: 76 },
    { termo: 'viagem econômica brasil', categoria: 'Viagem', valor: 71 },
    { termo: 'ansiedade e mindfulness', categoria: 'Saúde', valor: 89 },
    { termo: 'podcast de comédia brasileiro', categoria: 'Entretenimento', valor: 84 }
  ];

  for (const trend of trendingTerms) {
    // Adicionar variação aleatória para simular dados reais
    const variacao = (Math.random() - 0.5) * 20; // ±10 pontos
    const valorFinal = Math.max(0, Math.min(100, trend.valor + variacao));
    
    trends.push({
      fonte: 'google_trends_rising',
      item_nome: trend.termo,
      item_valor: valorFinal,
      regiao: 'BR',
      categoria_nicho: trend.categoria,
      growth_rate: Math.random() * 5 + 1 // 1-6% de crescimento
    });
  }

  return trends;
}

// Simular dados do TikTok (em produção, usar API real ou scraping)
async function collectTikTokTrends(): Promise<any[]> {
  const trends = [];
  
  const tiktokSounds = [
    { som: 'som_viral_danca_2025', categoria: 'Entretenimento', valor: 1250000 },
    { som: 'audio_motivacional_sucesso', categoria: 'Educação', valor: 890000 },
    { som: 'receita_rapida_trend', categoria: 'Culinária', valor: 750000 },
    { som: 'treino_casa_beat', categoria: 'Fitness', valor: 680000 },
    { som: 'dinheiro_investimento_audio', categoria: 'Finanças', valor: 920000 }
  ];

  for (const sound of tiktokSounds) {
    // Simular variação nos números de uso
    const variacao = (Math.random() - 0.5) * 200000;
    const valorFinal = Math.max(0, sound.valor + variacao);
    
    trends.push({
      fonte: 'tiktok_sound',
      item_nome: sound.som,
      item_valor: valorFinal,
      regiao: 'BR',
      categoria_nicho: sound.categoria,
      growth_rate: Math.random() * 8 + 2 // 2-10% de crescimento
    });
  }

  return trends;
}

async function saveTrendsToDatabase(trends: any[]): Promise<number> {
  let savedCount = 0;
  
  for (const trend of trends) {
    try {
      const { error } = await supabase
        .from('tendencias_globais')
        .insert({
          fonte: trend.fonte,
          item_nome: trend.item_nome,
          item_valor: trend.item_valor,
          regiao: trend.regiao,
          categoria_nicho: trend.categoria_nicho,
          growth_rate: trend.growth_rate,
          status: 'new',
          data_coleta: new Date().toISOString()
        });

      if (error) {
        // Se for erro de duplicata, ignorar (UNIQUE constraint)
        if (!error.message.includes('duplicate key')) {
          console.error('Error saving trend:', error);
        }
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error('Unexpected error saving trend:', err);
    }
  }
  
  return savedCount;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    console.log('🔍 Iniciando coleta de tendências...');

    // Coletar dados de diferentes fontes
    const [googleTrends, tiktokTrends] = await Promise.all([
      collectGoogleTrends(),
      collectTikTokTrends()
    ]);

    const allTrends = [...googleTrends, ...tiktokTrends];
    
    console.log(`📊 Coletadas ${allTrends.length} tendências`);

    // Salvar no banco de dados
    const savedCount = await saveTrendsToDatabase(allTrends);

    // Log da execução
    await supabase.from('logs').insert({
      event: 'trend_collection_completed',
      user_id: null, // Sistema
      success: true,
      metadata: {
        total_collected: allTrends.length,
        total_saved: savedCount,
        sources: ['google_trends', 'tiktok'],
        categories: CATEGORIAS_NICHO.length
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'Coleta de tendências concluída',
        total_collected: allTrends.length,
        total_saved: savedCount,
        sources: ['Google Trends', 'TikTok'],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na coleta de tendências:', error);
    
    // Log do erro
    await supabase.from('logs').insert({
      event: 'trend_collection_failed',
      user_id: null,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        error: 'Erro na coleta de tendências',
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