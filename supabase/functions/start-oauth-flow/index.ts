import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://luxury-crepe-10dd8a.netlify.app';

// OAuth Credentials
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const tiktokClientKey = Deno.env.get('TIKTOK_CLIENT_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

function generateOAuthURL(platform: string, state: string): string {
  const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
  
  switch (platform) {
    case 'youtube':
      const googleScopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '); // Space-separated for Google

      return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(googleScopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`;

    case 'tiktok':
      const tiktokScopes = [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.list'
      ].join(','); // Comma-separated for TikTok

      return `https://www.tiktok.com/v2/auth/authorize/?` +
        `client_key=${tiktokClientKey}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(tiktokScopes)}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`;

    case 'instagram':
      // Instagram uses Facebook's OAuth (Meta for Developers)
      const instagramScopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list'
      ].join(',');

      return `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${Deno.env.get('FACEBOOK_APP_ID')}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(instagramScopes)}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`;

    default:
      throw new Error(`Plataforma não suportada: ${platform}`);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
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

    // Obter dados da requisição
    const { platform, state } = await req.json();

    if (!platform) {
      throw new Error('Platform parameter is required');
    }

    // Validar plataforma suportada
    const supportedPlatforms = ['youtube', 'tiktok', 'instagram'];
    if (!supportedPlatforms.includes(platform)) {
      throw new Error(`Plataforma não suportada: ${platform}`);
    }

    console.log(`Starting OAuth flow for platform: ${platform}, user: ${user.id}`);

    // Gerar URL de autorização específica da plataforma
    const authUrl = generateOAuthURL(platform, state || platform);

    console.log(`Generated OAuth URL for ${platform}: ${authUrl.substring(0, 100)}...`);

    // Log da operação
    await supabase.from('logs').insert({
      event: 'oauth_flow_started',
      user_id: user.id,
      success: true,
      metadata: {
        platform,
        state,
        redirect_uri: `${supabaseUrl}/functions/v1/oauth-callback`
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        auth_url: authUrl,
        platform,
        state
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Method not allowed')) {
      statusCode = 405;
      errorMessage = 'Método não permitido';
    } else if (error.message.includes('required') || error.message.includes('não suportada')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    // Log do erro
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          await supabase.from('logs').insert({
            event: 'oauth_flow_failed',
            user_id: user.id,
            success: false,
            error: error.message,
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
        details: statusCode === 500 ? undefined : error.message
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});