import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IdeiaGerada {
  nome: string;
  descricao: string;
  redeSocial: string;
  potencialViral: 'alto' | 'médio' | 'baixo';
}

interface RateLimitInfo {
  count: number;
  reset: number;
  limit: number;
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

  // Count requests in the last hour
  const { count, error } = await supabase
    .from('logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('event', 'idea_generated')
    .gte('timestamp', new Date(windowStart).toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // Don't block on rate limit check errors
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
          content: 'Você é um especialista em marketing viral e criação de conteúdo para redes sociais. Sempre responda em português brasileiro.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 500
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

function parseIdeiaResponse(content: string): IdeiaGerada {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content);
    if (parsed.nome && parsed.descricao) {
      return {
        nome: parsed.nome,
        descricao: parsed.descricao,
        redeSocial: parsed.redeSocial || 'Instagram',
        potencialViral: parsed.potencialViral || 'médio'
      };
    }
  } catch {
    // If not JSON, parse as text
  }

  // Parse text format
  const lines = content.split('\n').filter(line => line.trim());
  
  let nome = 'Ideia Criativa';
  let descricao = content;
  let redeSocial = 'Instagram';
  let potencialViral: 'alto' | 'médio' | 'baixo' = 'médio';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('nome') && lower.includes(':')) {
      nome = line.split(':')[1]?.trim() || nome;
    } else if (lower.includes('descrição') && lower.includes(':')) {
      descricao = line.split(':')[1]?.trim() || descricao;
    } else if (lower.includes('rede') && lower.includes(':')) {
      redeSocial = line.split(':')[1]?.trim() || redeSocial;
    } else if (lower.includes('potencial') && lower.includes(':')) {
      const potential = line.split(':')[1]?.trim().toLowerCase();
      if (potential?.includes('alto')) potencialViral = 'alto';
      else if (potential?.includes('baixo')) potencialViral = 'baixo';
    }
  }

  return { nome, descricao, redeSocial, potencialViral };
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
    
    // Build personalized prompt
    let prompt = '';
    
    if (format === 'structured') {
      prompt = `Crie uma ideia viral estruturada para redes sociais.

${metadata.nomeEmpresa ? `Empresa: ${metadata.nomeEmpresa}` : ''}
${metadata.nicho ? `Nicho: ${metadata.nicho}` : ''}
${metadata.subnicho ? `Sub-nicho: ${metadata.subnicho}` : ''}
${metadata.sobre ? `Sobre a marca: ${metadata.sobre}` : ''}
${metadata.tomDeVoz ? `Tom de voz: ${metadata.tomDeVoz}` : ''}
${metadata.objetivo ? `Objetivo: ${metadata.objetivo}` : ''}

Responda EXATAMENTE no formato JSON:
{
  "nome": "Nome curto e impactante da ideia",
  "descricao": "Descrição detalhada em até 200 caracteres",
  "redeSocial": "Instagram, TikTok, YouTube ou LinkedIn",
  "potencialViral": "alto, médio ou baixo"
}

A ideia deve ser:
- Original e criativa
- Alinhada com tendências atuais
- Viável de implementar
- Específica para o nicho mencionado`;
    } else {
      prompt = `Gere uma ideia viral criativa e original para redes sociais.

${metadata.nomeEmpresa ? `Para a empresa: ${metadata.nomeEmpresa}` : ''}
${metadata.nicho ? `Nicho: ${metadata.nicho}` : ''}
${metadata.objetivo ? `Objetivo: ${metadata.objetivo}` : ''}

A ideia deve ser:
- Concisa (máximo 280 caracteres)
- Criativa e original
- Alinhada com tendências atuais
- Pronta para implementar

Responda apenas com a ideia, sem explicações extras.`;
    }

    // Call AI API
    const aiResponse = await callOpenRouterAPI(prompt);

    let result;
    if (format === 'structured') {
      result = parseIdeiaResponse(aiResponse);
    } else {
      result = aiResponse;
    }

    // Log successful interaction
    await supabase.from('logs').insert({
      event: 'idea_generated',
      user_id: user.id,
      success: true,
      metadata: {
        context,
        format,
        prompt_length: prompt.length,
        response_length: aiResponse.length,
        has_profile: !!(metadata.nomeEmpresa || metadata.nicho)
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(result),
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