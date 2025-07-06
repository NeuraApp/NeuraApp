// Tipos para o sistema de conteúdo preditivo

export interface IdeiaViral {
  id: string;
  user_id: string;
  conteudo: string;
  categoria: string;
  formato: string;
  plataforma_alvo: string;
  favorito?: boolean;
  created_at: string;
}

export interface PerformanceConteudo {
  id: string;
  ideia_id: string;
  user_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  retention_rate_3s: number;
  retention_rate_15s: number;
  retention_rate_30s: number;
  average_watch_time: number;
  click_through_rate: number;
  conversion_rate: number;
  posted_at: string;
  collected_at: string;
  platform_specific_data: Record<string, any>;
}

export interface ContentAnalytics {
  id: string;
  user_id: string;
  conteudo: string;
  categoria: string;
  formato: string;
  plataforma_alvo: string;
  created_at: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  retention_rate_3s?: number;
  average_watch_time?: number;
  performance_score?: number;
  posted_at?: string;
  collected_at?: string;
}

export interface ContentInsights {
  best_categoria: string;
  best_formato: string;
  best_plataforma: string;
  avg_performance_score: number;
  total_content_pieces: number;
}

export type Categoria = 
  | 'Educacional'
  | 'Humor'
  | 'Opinião Contrária'
  | 'Storytelling'
  | 'Motivacional'
  | 'Tutorial'
  | 'Tendência';

export type Formato = 
  | 'Tutorial'
  | 'POV'
  | 'Lista'
  | 'Reação'
  | 'Desafio'
  | 'Antes/Depois'
  | 'Pergunta'
  | 'Dica Rápida';

export type PlataformaAlvo = 
  | 'TikTok'
  | 'YouTube'
  | 'Instagram Reels'
  | 'LinkedIn'
  | 'Twitter';