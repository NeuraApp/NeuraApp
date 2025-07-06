import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface YouTubeConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  platform_data: any;
}

interface ContentToSync {
  id: string;
  user_id: string;
  conteudo: string;
  created_at: string;
}

async function refreshAccessToken(connection: YouTubeConnection): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokenData = await response.json();
  
  // Atualizar token no banco
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  await supabase
    .from('user_connections')
    .update({
      access_token: tokenData.access_token,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .eq('id', connection.id);

  return tokenData.access_token;
}

async function getValidAccessToken(connection: YouTubeConnection): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  
  // Se token expira em menos de 5 minutos, renovar
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(connection);
  }
  
  return connection.access_token;
}

async function searchYouTubeVideos(accessToken: string, channelId: string, query: string) {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    channelId: channelId,
    q: query,
    type: 'video',
    maxResults: '5',
    order: 'date'
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube Search API error: ${response.status}`);
  }

  return await response.json();
}

async function getVideoAnalytics(accessToken: string, videoId: string) {
  // YouTube Analytics API v2
  const analyticsParams = new URLSearchParams({
    ids: `channel==MINE`,
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
    metrics: 'views,likes,comments,shares,averageViewDuration,averageViewPercentage',
    filters: `video==${videoId}`,
    dimensions: 'video'
  });

  const response = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${analyticsParams}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube Analytics API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.rows && data.rows.length > 0) {
    const row = data.rows[0];
    return {
      views: row[1] || 0,
      likes: row[2] || 0,
      comments: row[3] || 0,
      shares: row[4] || 0,
      average_watch_time: row[5] || 0,
      retention_rate_3s: (row[6] || 0) / 100 // Converter percentual para decimal
    };
  }
  
  return null;
}

async function syncUserContent(connection: YouTubeConnection) {
  const accessToken = await getValidAccessToken(connection);
  const channelId = connection.platform_data?.channel_id;
  
  if (!channelId) {
    throw new Error('Channel ID not found in connection data');
  }

  // Buscar conteúdos do usuário que ainda não têm performance data
  const { data: contentToSync, error: contentError } = await supabase
    .from('ideias_virais')
    .select('id, user_id, conteudo, created_at')
    .eq('user_id', connection.user_id)
    .eq('plataforma_alvo', 'YouTube')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 dias
    .not('id', 'in', `(SELECT ideia_id FROM performance_conteudo WHERE ideia_id IS NOT NULL)`);

  if (contentError) {
    throw new Error(`Error fetching content: ${contentError.message}`);
  }

  let syncedCount = 0;
  const errors: string[] = [];

  for (const content of contentToSync || []) {
    try {
      // Extrair palavras-chave do conteúdo para busca
      const searchQuery = content.conteudo
        .substring(0, 100)
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .slice(0, 5)
        .join(' ');

      // Buscar vídeos relacionados
      const searchResults = await searchYouTubeVideos(accessToken, channelId, searchQuery);
      
      if (searchResults.items && searchResults.items.length > 0) {
        // Pegar o primeiro vídeo (mais recente)
        const video = searchResults.items[0];
        const videoId = video.id.videoId;
        
        // Obter analytics do vídeo
        const analytics = await getVideoAnalytics(accessToken, videoId);
        
        if (analytics) {
          // Salvar performance data
          await supabase.from('performance_conteudo').insert({
            ideia_id: content.id,
            user_id: content.user_id,
            views: analytics.views,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            retention_rate_3s: analytics.retention_rate_3s,
            average_watch_time: analytics.average_watch_time,
            posted_at: video.snippet.publishedAt,
            platform_specific_data: {
              video_id: videoId,
              video_title: video.snippet.title,
              video_description: video.snippet.description,
              thumbnail_url: video.snippet.thumbnails?.default?.url
            }
          });
          
          syncedCount++;
        }
      }
      
      // Rate limiting - aguardar entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error syncing content ${content.id}:`, error);
      errors.push(`Content ${content.id}: ${error.message}`);
    }
  }

  // Atualizar timestamp da última sincronização
  await supabase
    .from('user_connections')
    .update({ 
      last_sync_at: new Date().toISOString(),
      sync_error: errors.length > 0 ? errors.join('; ') : null
    })
    .eq('id', connection.id);

  return { syncedCount, errors };
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Buscar todas as conexões ativas do YouTube
    const { data: connections, error: connectionsError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('platform', 'youtube')
      .eq('status', 'active');

    if (connectionsError) {
      throw new Error(`Error fetching connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active YouTube connections found',
          synced_users: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let totalSynced = 0;

    for (const connection of connections) {
      try {
        const result = await syncUserContent(connection);
        results.push({
          user_id: connection.user_id,
          platform_username: connection.platform_username,
          synced_count: result.syncedCount,
          errors: result.errors
        });
        totalSynced += result.syncedCount;
        
        // Log sucesso
        await supabase.from('logs').insert({
          event: 'youtube_sync_completed',
          user_id: connection.user_id,
          success: true,
          metadata: {
            synced_count: result.syncedCount,
            errors_count: result.errors.length
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`Error syncing user ${connection.user_id}:`, error);
        
        // Marcar conexão com erro
        await supabase
          .from('user_connections')
          .update({ 
            status: 'error',
            sync_error: error.message,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', connection.id);

        // Log erro
        await supabase.from('logs').insert({
          event: 'youtube_sync_failed',
          user_id: connection.user_id,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        results.push({
          user_id: connection.user_id,
          platform_username: connection.platform_username,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'YouTube Analytics sync completed',
        synced_users: connections.length,
        total_content_synced: totalSynced,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('YouTube sync error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro na sincronização com YouTube Analytics',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});