import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// OAuth2 Configuration
const OAUTH_CONFIG = {
  youtube: {
    client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly'
    ]
  },
  tiktok: {
    client_id: Deno.env.get('TIKTOK_CLIENT_ID')!,
    auth_url: 'https://www.tiktok.com/auth/authorize/',
    scopes: [
      'user.info.basic',
      'video.list',
      'video.insights'
    ]
  }
};

const supabase = createClient(supabaseUrl, supabaseKey);

function generateState(userId: string, platform: string): string {
  // Gerar state seguro para prevenir CSRF
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return btoa(`${userId}:${platform}:${timestamp}:${random}`);
}

function buildAuthUrl(platform: string, state: string, redirectUri: string): string {
  const config = OAUTH_CONFIG[platform as keyof typeof OAUTH_CONFIG];
  if (!config) {
    throw new Error(`Platform ${platform} not supported`);
  }

  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    response_type: 'code',
    state: state,
    access_type: 'offline', // Para obter refresh token
    prompt: 'consent' // Forçar consentimento para refresh token
  });

  return `${config.auth_url}?${params.toString()}`;
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

    const { platform } = await req.json();

    if (!platform || !OAUTH_CONFIG[platform as keyof typeof OAUTH_CONFIG]) {
      throw new Error('Invalid or unsupported platform');
    }

    // Gerar state para segurança CSRF
    const state = generateState(user.id, platform);
    
    // URL de callback (aponta para nossa edge function)
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
    
    // Construir URL de autorização
    const authUrl = buildAuthUrl(platform, state, redirectUri);

    // Salvar state temporariamente para validação posterior
    await supabase.from('logs').insert({
      event: 'oauth_flow_started',
      user_id: user.id,
      success: true,
      metadata: {
        platform,
        state,
        redirect_uri: redirectUri
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        auth_url: authUrl,
        state,
        platform,
        expires_in: 600 // State válido por 10 minutos
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('OAuth flow start error:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Invalid') || error.message.includes('unsupported')) {
      statusCode = 400;
      errorMessage = error.message;
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