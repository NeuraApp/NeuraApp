import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://luxury-crepe-10dd8a.netlify.app';

// OAuth Credentials
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const tiktokClientKey = Deno.env.get('TIKTOK_CLIENT_KEY')!;
const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface UserInfo {
  id: string;
  username: string;
  name?: string;
  email?: string;
}

async function exchangeCodeForTokens(platform: string, code: string): Promise<TokenResponse> {
  const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
  
  switch (platform) {
    case 'youtube':
      const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      return await googleResponse.json();

    case 'tiktok':
      const tiktokResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: tiktokClientKey,
          client_secret: tiktokClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tiktokResponse.ok) {
        const errorText = await tiktokResponse.text();
        throw new Error(`TikTok token exchange failed: ${errorText}`);
      }

      const tiktokData = await tiktokResponse.json();
      
      if (tiktokData.error) {
        throw new Error(`TikTok OAuth error: ${tiktokData.error_description || tiktokData.error}`);
      }

      return tiktokData;

    case 'instagram':
      // Instagram token exchange (via Facebook Graph API)
      const instagramResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('FACEBOOK_APP_ID')!,
          client_secret: Deno.env.get('FACEBOOK_APP_SECRET')!,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!instagramResponse.ok) {
        const errorText = await instagramResponse.text();
        throw new Error(`Instagram token exchange failed: ${errorText}`);
      }

      return await instagramResponse.json();

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function getUserInfo(platform: string, accessToken: string): Promise<UserInfo> {
  switch (platform) {
    case 'youtube':
      // Get YouTube channel info
      const youtubeResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!youtubeResponse.ok) {
        throw new Error('Failed to fetch YouTube user info');
      }

      const youtubeData = await youtubeResponse.json();
      const channel = youtubeData.items?.[0];

      if (!channel) {
        throw new Error('No YouTube channel found');
      }

      return {
        id: channel.id,
        username: channel.snippet.title,
        name: channel.snippet.title
      };

    case 'tiktok':
      // Get TikTok user info
      const tiktokResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username']
        }),
      });

      if (!tiktokResponse.ok) {
        const errorText = await tiktokResponse.text();
        throw new Error(`TikTok user info failed: ${errorText}`);
      }

      const tiktokData = await tiktokResponse.json();
      
      if (tiktokData.error) {
        throw new Error(`TikTok user info error: ${tiktokData.error.message || tiktokData.error}`);
      }

      const tiktokUser = tiktokData.data?.user;
      if (!tiktokUser) {
        throw new Error('No TikTok user data found');
      }

      return {
        id: tiktokUser.open_id,
        username: tiktokUser.username || tiktokUser.display_name,
        name: tiktokUser.display_name
      };

    case 'instagram':
      // Get Instagram user info (via Facebook Graph API)
      const instagramResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,accounts{id,name,username,category}&access_token=${accessToken}`
      );

      if (!instagramResponse.ok) {
        throw new Error('Failed to fetch Instagram user info');
      }

      const instagramData = await instagramResponse.json();
      
      // Find Instagram business account
      const instagramAccount = instagramData.accounts?.data?.find(
        (account: any) => account.category === 'Business' || account.category === 'Creator'
      );

      if (!instagramAccount) {
        throw new Error('No Instagram business account found');
      }

      return {
        id: instagramAccount.id,
        username: instagramAccount.username,
        name: instagramAccount.name
      };

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
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

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      const errorDescription = url.searchParams.get('error_description') || 'OAuth authorization failed';
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/minha-conta?error=${encodeURIComponent(errorDescription)}`
        }
      });
    }

    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }

    const platform = state; // Platform is passed as state parameter
    
    console.log(`Processing OAuth callback for platform: ${platform}, code: ${code.substring(0, 10)}...`);

    // Exchange authorization code for access tokens
    const tokenData = await exchangeCodeForTokens(platform, code);
    
    console.log(`Token exchange successful for ${platform}`);

    // Get user information from the platform
    const userInfo = await getUserInfo(platform, tokenData.access_token);
    
    console.log(`User info retrieved for ${platform}: ${userInfo.username}`);

    // For direct function invocation (from frontend)
    if (req.method === 'POST') {
      const body = await req.json();
      const { platform: bodyPlatform, accessToken } = body;
      
      if (!bodyPlatform || !accessToken) {
        throw new Error('Platform and accessToken are required');
      }

      // Get user from auth header
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

      // Get user info with provided access token
      const directUserInfo = await getUserInfo(bodyPlatform, accessToken);

      // Save connection to database
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour default
      
      const { error: saveError } = await supabase
        .from('user_connections')
        .upsert({
          user_id: user.id,
          platform: bodyPlatform,
          platform_user_id: directUserInfo.id,
          platform_username: directUserInfo.username,
          access_token: accessToken,
          expires_at: expiresAt.toISOString(),
          status: 'active',
          platform_data: {
            name: directUserInfo.name,
            username: directUserInfo.username
          }
        }, {
          onConflict: 'user_id,platform'
        });

      if (saveError) {
        throw new Error(`Failed to save connection: ${saveError.message}`);
      }

      console.log(`Connection saved for user ${user.id} on platform ${bodyPlatform}`);

      return new Response(
        JSON.stringify({
          success: true,
          platform: bodyPlatform,
          username: directUserInfo.username
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For OAuth redirect flow, we need to get the user from session
    // Since we can't get user from auth header in redirect, we'll redirect with tokens
    const redirectUrl = new URL(`${frontendUrl}/minha-conta`);
    redirectUrl.hash = `provider_token=${tokenData.access_token}&platform=${platform}`;
    
    if (tokenData.refresh_token) {
      redirectUrl.hash += `&provider_refresh_token=${tokenData.refresh_token}`;
    }
    
    if (tokenData.expires_in) {
      redirectUrl.hash += `&expires_in=${tokenData.expires_in}`;
    }

    console.log(`Redirecting to frontend with tokens for ${platform}`);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString()
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to frontend with error
    const errorUrl = `${frontendUrl}/minha-conta?error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': errorUrl
      }
    });
  }
});