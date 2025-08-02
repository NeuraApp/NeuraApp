import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TikTokConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  platform_data: any;
}

async function refreshTikTokToken(connection: TikTokConnection): Promise<string> {
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: Deno.env.get('TIKTOK_CLIENT_KEY')!,
      client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET')!,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh TikTok access token: ${errorText}`);
  }

  const tokenData = await response.json();
  
  if (tokenData.error) {
    throw new Error(`TikTok token refresh error: ${tokenData.error_description || tokenData.error}`);
  }

  // Atualizar token no banco
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  await supabase
    .from('user_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token, // Keep existing if not provided
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .eq('id', connection.id);

  return tokenData.access_token;
}

async function getValidTikTokToken(connection: TikTokConnection): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  
  // Se token expira em menos de 1 hora, renovar
  if (expiresAt.getTime() - now.getTime() < 60 * 60 * 1000) {
    return await refreshTikTokToken(connection);
  }
  
  return connection.access_token;
}

async function getTikTokVideos(accessToken: string, openId: string) {
  const response = await fetch('https://open.tiktokapis.com/v2/video/list/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      max_count: 20,
      cursor: 0,
      fields: [
        'id',
        'title',
        'video_description',
        'create_time',
        'cover_image_url',
        'share_url',
        'duration'
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok Video List API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`TikTok API error: ${data.error.message || data.error}`);
  }

  return data.data;
}

async function getTikTokVideoAnalytics(accessToken: string, openId: string, videoIds: string[]) {
  const response = await fetch('https://open.tiktokapis.com/v2/research/video/query/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: {
        video_ids: videoIds
      },
      fields: [
        'id',
        'like_count',
        'comment_count',
        'share_count',
        'view_count',
        'play_count'
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok Analytics API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`TikTok Analytics API error: ${data.error.message || data.error}`);
  }

  return data.data;
}

function findMatchingVideo(videos: any[], contentText: string, contentDate: string) {
  const contentWords = contentText
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 10);

  const contentTimestamp = new Date(contentDate).getTime();
  
  let bestMatch = null;
  let bestScore = 0;

  for (const video of videos) {
    const videoTimestamp = video.create_time * 1000;
    const timeDiff = Math.abs(videoTimestamp - contentTimestamp);
    
    // Priorizar vídeos postados até 7 dias após a criação da ideia
    if (timeDiff > 7 * 24 * 60 * 60 * 1000) continue;
    
    // Calcular score baseado na proximidade temporal
    const timeScore = Math.max(0, 1 - (timeDiff / (7 * 24 * 60 * 60 * 1000)));
    
    // Calcular score baseado na similaridade do título/descrição
    const videoText = `${video.title || ''} ${video.video_description || ''}`.toLowerCase();
    const matchingWords = contentWords.filter(word => videoText.includes(word));
    const textScore = matchingWords.length / contentWords.length;
    
    const totalScore = (timeScore * 0.7) + (textScore * 0.3);
    
    if (totalScore > bestScore && totalScore > 0.3) {
      bestScore = totalScore;
      bestMatch = video;
    }
  }

  return bestMatch;
}

async function syncUserTikTokContent(connection: TikTokConnection) {
  const accessToken = await getValidTikTokToken(connection);
  const openId = connection.platform_data?.open_id;
  
  if (!openId) {
    throw new Error('Open ID not found in connection data');
  }

  // Buscar conteúdos do usuário que ainda não têm performance data
  const { data: contentToSync, error: contentError } = await supabase
    .from('ideias_virais')
    .select('id, user_id, conteudo, created_at')
    .eq('user_id', connection.user_id)
    .eq('plataforma_alvo', 'TikTok')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 dias
    .not('id', 'in', `(SELECT ideia_id FROM performance_conteudo WHERE ideia_id IS NOT NULL)`);

  if (contentError) {
    throw new Error(`Error fetching content: ${contentError.message}`);
  }

  if (!contentToSync || contentToSync.length === 0) {
    return { syncedCount: 0, errors: [] };
  }

  // Obter lista de vídeos do TikTok
  const videosData = await getTikTokVideos(accessToken, openId);
  const videos = videosData.videos || [];

  if (videos.length === 0) {
    return { syncedCount: 0, errors: ['No videos found on TikTok account'] };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  // Processar conteúdos em lotes para otimizar chamadas à API
  const batchSize = 10;
  for (let i = 0; i < contentToSync.length; i += batchSize) {
    const batch = contentToSync.slice(i, i + batchSize);
    
    for (const content of batch) {
      try {
        // Encontrar vídeo correspondente
        const matchingVideo = findMatchingVideo(videos, content.conteudo, content.created_at);
        
        if (matchingVideo) {
          // Obter analytics do vídeo
          const analyticsData = await getTikTokVideoAnalytics(
            accessToken, 
            openId, 
            [matchingVideo.id]
          );
          
          if (analyticsData.videos && analyticsData.videos.length > 0) {
            const analytics = analyticsData.videos[0];
            
            // Calcular métricas derivadas
            const viewCount = analytics.view_count || analytics.play_count || 0;
            const likeCount = analytics.like_count || 0;
            const commentCount = analytics.comment_count || 0;
            const shareCount = analytics.share_count || 0;
            
            // Estimar retention rates baseado nos dados disponíveis (valores padrão)
            const retention_rate_3s = 0.8; // Estimativa padrão
            const retention_rate_15s = 0.5; // Estimativa padrão
            const retention_rate_30s = 0.3; // Estimativa padrão
            const averageWatchTime = matchingVideo.duration ? matchingVideo.duration * 0.4 : 15; // Estimativa

            // Salvar performance data
            await supabase.from('performance_conteudo').insert({
              ideia_id: content.id,
              user_id: content.user_id,
              views: viewCount,
              likes: likeCount,
              comments: commentCount,
              shares: shareCount,
              retention_rate_3s,
              retention_rate_15s,
              retention_rate_30s,
              average_watch_time: averageWatchTime,
              posted_at: new Date(matchingVideo.create_time * 1000).toISOString(),
              platform_specific_data: {
                video_id: matchingVideo.id,
                video_title: matchingVideo.title,
                video_description: matchingVideo.video_description,
                cover_image_url: matchingVideo.cover_image_url,
                share_url: matchingVideo.share_url,
                duration: matchingVideo.duration
              }
            });
            
            syncedCount++;
          }
        }
        
      } catch (error) {
        console.error(`Error syncing TikTok content ${content.id}:`, error);
        errors.push(`Content ${content.id}: ${error.message}`);
      }
    }
    
    // Rate limiting entre lotes
    if (i + batchSize < contentToSync.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Buscar todas as conexões ativas do TikTok
    const { data: connections, error: connectionsError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('platform', 'tiktok')
      .eq('status', 'active');

    if (connectionsError) {
      throw new Error(`Error fetching connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active TikTok connections found',
          synced_users: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let totalSynced = 0;

    for (const connection of connections) {
      try {
        const result = await syncUserTikTokContent(connection);
        results.push({
          user_id: connection.user_id,
          platform_username: connection.platform_username,
          synced_count: result.syncedCount,
          errors: result.errors
        });
        totalSynced += result.syncedCount;
        
        // Log sucesso
        await supabase.from('logs').insert({
          event: 'tiktok_sync_completed',
          user_id: connection.user_id,
          success: true,
          metadata: {
            synced_count: result.syncedCount,
            errors_count: result.errors.length
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`Error syncing TikTok user ${connection.user_id}:`, error);
        
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
          event: 'tiktok_sync_failed',
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
        message: 'TikTok Analytics sync completed',
        synced_users: connections.length,
        total_content_synced: totalSynced,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TikTok sync error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro na sincronização com TikTok Analytics',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});