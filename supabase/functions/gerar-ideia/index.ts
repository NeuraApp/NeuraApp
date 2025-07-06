import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IdeiaGeradaCompleta {
  conteudo: string;
  categoria: string;
  formato: string;
  plataforma_alvo: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting: 10 requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX = 10;

async function checkRateLimit(userId: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  const { count, error } = await supabase
    .from('logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('event', 'idea_generated')
    .gte('timestamp', new Date(windowStart).toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    return;
  }

  if (count && count >= RATE_LIMIT_MAX) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} requests per hour.`);
  }
}

async function callOpenRouterAPI(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://neura.app',
      'X-Title': 'NEURA - AI Content Generator'
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em marketing viral e criação de conteúdo para redes sociais. Sempre responda em português brasileiro com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 600
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

function parseIdeiaResponse(content: string): IdeiaGeradaCompleta {
  try {
    // Tentar fazer parse como JSON primeiro
    const parsed = JSON.parse(content);
    
    if (parsed.conteudo && parsed.categoria && parsed.formato && parsed.plataforma_alvo) {
      return {
        conteudo: parsed.conteudo,
        categoria: parsed.categoria,
        formato: parsed.formato,
        plataforma_alvo: parsed.plataforma_alvo
      };
    }
  } catch (e) {
    console.log('Failed to parse as JSON, trying text parsing');
  }

  // Se não conseguir fazer parse como JSON, usar valores padrão
  return {
    conteudo: content,
    categoria: 'Educacional',
    formato: 'Tutorial',
    plataforma_alvo: 'Instagram'
  };
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

    // Check rate limiting
    await checkRateLimit(user.id);

    // Get request body
    const body = await req.json().catch(() => ({}));
    const context = body.context || 'general';
    const format = body.format || 'structured';

    // Get user profile for personalization
    const metadata = user.user_metadata || {};
    
    // Build enhanced prompt for structured content generation
    const prompt = `Crie uma ideia viral estruturada para redes sociais seguindo EXATAMENTE este formato JSON:

{
  "conteudo": "Descrição detalhada da ideia em até 300 caracteres",
  "categoria": "Uma das opções: Educacional, Humor, Opinião Contrária, Storytelling, Motivacional, Tutorial, Tendência",
  "formato": "Uma das opções: Tutorial, POV, Lista, Reação, Desafio, Antes/Depois, Pergunta, Dica Rápida",
  "plataforma_alvo": "Uma das opções: TikTok, YouTube, Instagram Reels, LinkedIn, Twitter"
}

CONTEXTO DO USUÁRIO:
${metadata.nomeEmpresa ? `Empresa: ${metadata.nomeEmpresa}` : ''}
${metadata.nicho ? `Nicho: ${metadata.nicho}` : ''}
${metadata.subnicho ? `Sub-nicho: ${metadata.subnicho}` : ''}
${metadata.sobre ? `Sobre a marca: ${metadata.sobre}` : ''}
${metadata.tomDeVoz ? `Tom de voz: ${metadata.tomDeVoz}` : ''}
${metadata.objetivo ? `Objetivo: ${metadata.objetivo}` : ''}

INSTRUÇÕES:
- A ideia deve ser original, criativa e alinhada com tendências atuais
- O conteúdo deve ser específico e acionável
- Escolha a categoria que melhor se adequa ao nicho
- Selecione o formato mais eficaz para o tipo de conteúdo
- Defina a plataforma ideal baseada no formato e audiência
- Responda APENAS com o JSON válido, sem texto adicional`;

    // Call AI API
    const aiResponse = await callOpenRouterAPI(prompt);
    const ideiaCompleta = parseIdeiaResponse(aiResponse);

    // Save to database with new structure
    const { data: savedIdeia, error: saveError } = await supabase
      .from('ideias_virais')
      .insert([
        {
          conteudo: ideiaCompleta.conteudo,
          categoria: ideiaCompleta.categoria,
          formato: ideiaCompleta.formato,
          plataforma_alvo: ideiaCompleta.plataforma_alvo,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.warn('Error saving idea:', saveError);
      // Don't fail the operation if save fails
    }

    // Log successful interaction
    await supabase.from('logs').insert({
      event: 'idea_generated',
      user_id: user.id,
      success: true,
      metadata: {
        context,
        format,
        categoria: ideiaCompleta.categoria,
        formato: ideiaCompleta.formato,
        plataforma_alvo: ideiaCompleta.plataforma_alvo,
        has_profile: !!(metadata.nomeEmpresa || metadata.nicho)
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(ideiaCompleta),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(RATE_LIMIT_MAX - 1),
          'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_WINDOW)
        } 
      }
    );

  } catch (error) {
    console.error(`Error generating idea: ${error.message}`);

    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    let errorDetails = error.message;

    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
      errorMessage = 'Limite de requisições excedido. Tente novamente em 1 hora.';
    } else if (error.message.includes('API de IA')) {
      statusCode = 503;
      errorMessage = 'Serviço de IA temporariamente indisponível';
    }

    // Log error
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          await supabase.from('logs').insert({
            event: 'idea_generated',
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