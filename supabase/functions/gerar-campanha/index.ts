import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface EtapaEstrategica {
  objetivo_etapa: string;
  ordem: number;
  descricao: string;
  data_sugerida_offset: number; // Dias a partir da data de início
}

interface CampanhaRequest {
  objetivo_principal: string;
  data_inicio: string;
  data_fim: string;
  nicho?: string;
}

async function callOpenRouterAPI(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://neura.app',
      'X-Title': 'NEURA - Campaign Generator'
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um estrategista de marketing digital especializado em campanhas de lançamento. Sempre responda em português brasileiro com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API Error:', response.status, errorText);
    throw new Error(`Erro na API de IA: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Resposta inválida da API de IA');
  }

  return content.trim();
}

async function gerarEtapasEstrategicas(objetivoPrincipal: string, nicho?: string): Promise<EtapaEstrategica[]> {
  const nichoContext = nicho ? `\nNicho: ${nicho}` : '';
  
  const prompt = `Como estrategista de marketing, crie uma sequência de etapas para uma campanha de lançamento.

OBJETIVO DA CAMPANHA: ${objetivoPrincipal}${nichoContext}

Retorne um JSON com um array de etapas seguindo EXATAMENTE este formato:

{
  "etapas": [
    {
      "objetivo_etapa": "Nome da etapa",
      "ordem": 1,
      "descricao": "Descrição do que esta etapa deve alcançar",
      "data_sugerida_offset": 0
    }
  ]
}

INSTRUÇÕES:
- Crie entre 4-6 etapas estratégicas
- Use nomes claros como: "Teaser", "Amostra de Valor", "Anúncio do Lançamento", "Prova Social", "Última Chamada"
- data_sugerida_offset é o número de dias a partir do início da campanha
- Distribua as etapas ao longo do período da campanha
- Cada etapa deve ter um propósito específico no funil de marketing
- Responda APENAS com o JSON válido`;

  const response = await callOpenRouterAPI(prompt);
  
  try {
    const parsed = JSON.parse(response);
    return parsed.etapas || [];
  } catch (e) {
    console.error('Erro ao fazer parse das etapas:', e);
    // Fallback com etapas padrão
    return [
      { objetivo_etapa: 'Teaser', ordem: 1, descricao: 'Despertar curiosidade', data_sugerida_offset: 0 },
      { objetivo_etapa: 'Amostra de Valor', ordem: 2, descricao: 'Mostrar valor do produto', data_sugerida_offset: 3 },
      { objetivo_etapa: 'Anúncio do Lançamento', ordem: 3, descricao: 'Revelar o produto', data_sugerida_offset: 7 },
      { objetivo_etapa: 'Prova Social', ordem: 4, descricao: 'Mostrar depoimentos', data_sugerida_offset: 10 },
      { objetivo_etapa: 'Última Chamada', ordem: 5, descricao: 'Urgência para conversão', data_sugerida_offset: 14 }
    ];
  }
}

async function gerarIdeiaParaEtapa(
  etapa: EtapaEstrategica,
  objetivoPrincipal: string,
  userId: string,
  userMetadata: any
): Promise<any> {
  // Chamar a função gerar-ideia com contexto específico da campanha
  const campaignContext = {
    objetivo_principal: objetivoPrincipal,
    objetivo_etapa: etapa.objetivo_etapa,
    ordem_etapa: etapa.ordem
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/gerar-ideia`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context: 'campaign_generation',
      campaign_context: campaignContext,
      include_hooks: true
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao gerar ideia para etapa ${etapa.objetivo_etapa}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate authorization
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

    // Get request body
    const campaignData: CampanhaRequest = await req.json();
    
    if (!campaignData.objetivo_principal) {
      throw new Error('Objetivo principal é obrigatório');
    }

    const metadata = user.user_metadata || {};
    
    console.log(`🎯 Gerando campanha: ${campaignData.objetivo_principal}`);

    // 1. Gerar etapas estratégicas usando IA
    const etapasEstrategicas = await gerarEtapasEstrategicas(
      campaignData.objetivo_principal,
      metadata.nicho
    );

    console.log(`📋 ${etapasEstrategicas.length} etapas estratégicas definidas`);

    // 2. Criar a campanha no banco
    const { data: campanhaCriada, error: campanhaError } = await supabase
      .from('campanhas')
      .insert({
        user_id: user.id,
        objetivo_principal: campaignData.objetivo_principal,
        data_inicio: campaignData.data_inicio,
        data_fim: campaignData.data_fim,
        status: 'rascunho'
      })
      .select()
      .single();

    if (campanhaError) {
      throw new Error(`Erro ao criar campanha: ${campanhaError.message}`);
    }

    console.log(`✅ Campanha criada: ${campanhaCriada.id}`);

    // 3. Gerar ideias para cada etapa
    const etapasCriadas = [];
    const dataInicio = new Date(campaignData.data_inicio);

    for (const etapa of etapasEstrategicas) {
      try {
        console.log(`🎨 Gerando ideia para etapa: ${etapa.objetivo_etapa}`);
        
        // Gerar ideia específica para esta etapa
        const ideiaGerada = await gerarIdeiaParaEtapa(
          etapa,
          campaignData.objetivo_principal,
          user.id,
          metadata
        );

        // Salvar a ideia no banco (já foi salva pela função gerar-ideia)
        // Buscar a ideia recém-criada
        const { data: ideiasSalvas } = await supabase
          .from('ideias_virais')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!ideiasSalvas || ideiasSalvas.length === 0) {
          throw new Error('Ideia não foi salva corretamente');
        }

        const ideiaId = ideiasSalvas[0].id;

        // Calcular data sugerida
        const dataSugerida = new Date(dataInicio);
        dataSugerida.setDate(dataSugerida.getDate() + etapa.data_sugerida_offset);

        // Criar etapa da campanha
        const { data: etapaCriada, error: etapaError } = await supabase
          .from('etapas_campanha')
          .insert({
            campanha_id: campanhaCriada.id,
            ideia_id: ideiaId,
            ordem_etapa: etapa.ordem,
            objetivo_etapa: etapa.objetivo_etapa,
            data_sugerida: dataSugerida.toISOString().split('T')[0], // YYYY-MM-DD
            status: 'pendente'
          })
          .select()
          .single();

        if (etapaError) {
          console.error(`Erro ao criar etapa ${etapa.objetivo_etapa}:`, etapaError);
          continue;
        }

        etapasCriadas.push({
          ...etapaCriada,
          ideia_conteudo: ideiaGerada.conteudo,
          ideia_categoria: ideiaGerada.categoria,
          ideia_formato: ideiaGerada.formato,
          ganchos_sugeridos: ideiaGerada.ganchos_sugeridos
        });

        console.log(`✅ Etapa criada: ${etapa.objetivo_etapa}`);

      } catch (error) {
        console.error(`Erro ao processar etapa ${etapa.objetivo_etapa}:`, error);
        // Continuar com as outras etapas mesmo se uma falhar
      }
    }

    // 4. Atualizar status da campanha
    await supabase
      .from('campanhas')
      .update({ status: 'ativa' })
      .eq('id', campanhaCriada.id);

    // 5. Log da operação
    await supabase.from('logs').insert({
      event: 'campaign_generated',
      user_id: user.id,
      success: true,
      metadata: {
        campanha_id: campanhaCriada.id,
        objetivo_principal: campaignData.objetivo_principal,
        total_etapas: etapasCriadas.length,
        etapas_criadas: etapasCriadas.map(e => e.objetivo_etapa)
      },
      timestamp: new Date().toISOString()
    });

    console.log(`🎉 Campanha completa gerada com ${etapasCriadas.length} etapas`);

    return new Response(
      JSON.stringify({
        campanha: campanhaCriada,
        etapas: etapasCriadas,
        message: `Campanha "${campaignData.objetivo_principal}" criada com ${etapasCriadas.length} etapas estratégicas`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Erro ao gerar campanha:', error);

    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    let errorDetails = error.message;

    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('obrigatório')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    // Log error
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          await supabase.from('logs').insert({
            event: 'campaign_generation_failed',
            user_id: user.id,
            success: false,
            error: errorDetails,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: statusCode === 500 ? undefined : errorDetails
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});