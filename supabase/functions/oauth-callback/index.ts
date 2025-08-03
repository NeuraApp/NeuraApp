import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// OAuth2 Token Exchange Configuration
const TOKEN_CONFIG = {
  youtube: {
    client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    token_url: 'https://oauth2.googleapis.com/token',
    user_info_url: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true'
  },
  tiktok: {
    client_id: Deno.env.get('TIKTOK_CLIENT_KEY')!,
    client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET')!,
    token_url: 'https://open.tiktokapis.com/v2/oauth/token/',
    user_info_url: 'https://open.tiktokapis.com/v2/user/info/'
  },
  tiktok: {
    client_id: Deno.env.get('TIKTOK_CLIENT_KEY')!,
    client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET')!,
    token_url: 'https://open.tiktokapis.com/v2/oauth/token/',
    user_info_url: 'https://open.tiktokapis.com/v2/user/info/'
  }
};

const supabase = createClient(supabaseUrl, supabaseKey);

function parseState(state: string): { userId: string; platform: string; timestamp: number } {
  try {
    const decoded = atob(state);
    const [userId, platform, timestamp] = decoded.split(':');
    return { userId, platform, timestamp: parseInt(timestamp) };
  } catch {
    throw new Error('Invalid state parameter');
  }
}

async function exchangeCodeForTokens(platform: string, code: string, redirectUri: string) {
  const config = TOKEN_CONFIG[platform as keyof typeof TOKEN_CONFIG];
  if (!config) {
    throw new Error(`Platform ${platform} not supported`);
  }

  let tokenResponse: Response;
  
  // Platform-specific token exchange
  switch (platform) {
    case 'youtube':
      tokenResponse = await fetch(config.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: config.client_secret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      break;
      
    case 'tiktok':
      tokenResponse = await fetch(config.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          client_key: config.client_id, // TikTok uses 'client_key'
          client_secret: config.client_secret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      break;
      
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      break;
      
    case 'tiktok':
      tokenResponse = await fetch(config.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          client_key: config.client_id, // TikTok uses 'client_key'
          client_secret: config.client_secret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      break;
      
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token exchange failed for ${platform}: ${errorText}`);
  }

  return await tokenResponse.json();
}

async function getUserInfo(platform: string, accessToken: string) {
  const config = TOKEN_CONFIG[platform as keyof typeof TOKEN_CONFIG];
  
  let userResponse: Response;
  
  // Platform-specific user info requests
  switch (platform) {
    case 'youtube':
      userResponse = await fetch(config.user_info_url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      break;
      
    case 'tiktok':
      userResponse = await fetch(config.user_info_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username']
        }),
      });
      break;
      
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
      userResponse = await fetch(config.user_info_url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      break;
      
    case 'tiktok':
      userResponse = await fetch(config.user_info_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username']
        }),
      });
      break;
      
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  if (!userResponse.ok) {
    const errorText = await userResponse.text();
    throw new Error(`Failed to fetch ${platform} user info: ${errorText}`);
  }

  const userData = await userResponse.json();
  
  // Normalizar dados do usuário por plataforma
  if (platform === 'youtube') {
    const channel = userData.items?.[0];
    return {
      platform_user_id: channel?.id,
      platform_username: channel?.snippet?.title,
      platform_data: {
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        channel_description: channel?.snippet?.description,
        thumbnail_url: channel?.snippet?.thumbnails?.default?.url,
        subscriber_count: channel?.statistics?.subscriberCount,
        video_count: channel?.statistics?.videoCount
      }
    };
  } else if (platform === 'tiktok') {
    const user = userData.data?.user;
    return {
      platform_user_id: user?.open_id || user?.union_id,
      platform_username: user?.display_name || user?.username,
      platform_data: {
        open_id: user?.open_id,
        union_id: user?.union_id,
        display_name: user?.display_name,
        username: user?.username,
        avatar_url: user?.avatar_url,
        follower_count: user?.follower_count,
        following_count: user?.following_count
      }
    };
  }
  
  throw new Error(`Unknown platform: ${platform}`);
  
  // Normalizar dados do usuário por plataforma
  if (platform === 'youtube') {
    const channel = userData.items?.[0];
    return {
      platform_user_id: channel?.id,
      platform_username: channel?.snippet?.title,
      platform_data: {
        channel_id: channel?.id,
        channel_title: channel?.snippet?.title,
        channel_description: channel?.snippet?.description,
        thumbnail_url: channel?.snippet?.thumbnails?.default?.url,
        subscriber_count: channel?.statistics?.subscriberCount,
        video_count: channel?.statistics?.videoCount
      }
    };
  } else if (platform === 'tiktok') {
    const user = userData.data?.user;
    return {
      platform_user_id: user?.open_id || user?.union_id,
      platform_username: user?.display_name || user?.username,
      platform_data: {
        open_id: user?.open_id,
        union_id: user?.union_id,
        display_name: user?.display_name,
        username: user?.username,
        avatar_url: user?.avatar_url,
        follower_count: user?.follower_count,
        following_count: user?.following_count
      }
    };
  }
  
  throw new Error(`Unknown platform: ${platform}`);
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Verificar se houve erro na autorização
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || 'Authorization failed';
      console.error(`OAuth authorization error for ${state}:`, error, errorDescription);
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/minha-conta?error=oauth_denied&message=${encodeURIComponent(errorDescription)}`
        }
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Validar e parsear state
    const { userId, platform, timestamp } = parseState(state);
    
    console.log(`Processing OAuth callback for platform: ${platform}, user: ${userId}`);
    
    console.log(`Processing OAuth callback for platform: ${platform}, user: ${userId}`);
    
    // Verificar se state não expirou (10 minutos)
    const now = Date.now();
    if (now - timestamp > 600000) {
      throw new Error('State expired');
    }

    // Verificar se o state foi gerado por nós
    const { data: logData } = await supabase
      .from('logs')
      .select('*')
      .eq('event', 'oauth_flow_started')
      .eq('user_id', userId)
      .eq('metadata->>state', state)
      .gte('timestamp', new Date(timestamp).toISOString())
      .single();

    if (!logData) {
      throw new Error('Invalid state - not found in logs');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Trocar code por tokens
    console.log(`Exchanging code for tokens - Platform: ${platform}`);
    console.log(`Exchanging code for tokens - Platform: ${platform}`);
    const tokenData = await exchangeCodeForTokens(platform, code, redirectUri);
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Obter informações do usuário da plataforma
    console.log(`Fetching user info for platform: ${platform}`);
    const userInfo = await getUserInfo(platform, tokenData.access_token);

    // Calcular data de expiração
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Salvar conexão no banco com upsert para garantir atualização
    console.log(`Saving connection to database for user: ${userId}, platform: ${platform}`);
    console.log(`Saving connection to database for user: ${userId}, platform: ${platform}`);
    const { error: saveError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: userId,
        platform,
        platform_user_id: userInfo.platform_user_id,
        platform_username: userInfo.platform_username,
        access_token: tokenData.access_token, // TODO: Criptografar
        refresh_token: tokenData.refresh_token, // TODO: Criptografar
        expires_at: expiresAt?.toISOString(),
        scopes: tokenData.scope?.split(' ') || [],
        status: 'active',
      }, {
        onConflict: 'user_id,platform'
      });

    if (saveError) {
      console.error('Database save error:', saveError);
      console.error('Database save error:', saveError);
      throw new Error(`Failed to save connection: ${saveError.message}`);
    }

    console.log(`Successfully saved ${platform} connection for user ${userId}`);

    console.log(`Successfully saved ${platform} connection for user ${userId}`);

    // Log sucesso
    await supabase.from('logs').insert({
      event: 'oauth_connection_created',
      user_id: userId,
      success: true,
      metadata: {
        platform,
        platform_user_id: userInfo.platform_user_id,
        platform_username: userInfo.platform_username,
        scopes: tokenData.scope?.split(' ') || [],
        token_expires_at: expiresAt?.toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Redirecionar para frontend com sucesso
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${frontendUrl}/minha-conta?success=connection_created&platform=${platform}&username=${encodeURIComponent(userInfo.platform_username || '')}`
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Log erro
    try {
      const url = new URL(req.url);
      const state = url.searchParams.get('state');
      if (state) {
        const { userId } = parseState(state);
        await supabase.from('logs').insert({
          event: 'oauth_connection_failed',
          user_id: userId,
          success: false,
          error: error.message,
          metadata: {
            platform: state.includes(':') ? parseState(state).platform : 'unknown',
            error_type: error.name || 'UnknownError'
          },
          metadata: {
            platform: state.includes(':') ? parseState(state).platform : 'unknown',
            error_type: error.name || 'UnknownError'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (logError) {
      console.error('Failed to log OAuth error:', logError);
    }

    // Redirecionar para frontend com erro
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${frontendUrl}/minha-conta?error=connection_failed&message=${encodeURIComponent(error.message)}`
      }
    });
  }
});