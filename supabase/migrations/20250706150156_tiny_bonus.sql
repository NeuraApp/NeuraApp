/*
  # Fase 1: Base de Dados para Estratégia de Conteúdo Preditiva
  
  1. Modificações na tabela ideias_virais
    - Adicionar colunas para classificação de conteúdo
    - Índices para otimização de queries
  
  2. Nova tabela performance_conteudo
    - Estrutura para métricas de performance
    - Preparação para integrações futuras
  
  3. Comentários e documentação
    - Explicação de cada campo
    - Preparação para machine learning
*/

-- 1. MODIFICAR TABELA IDEIAS_VIRAIS
ALTER TABLE public.ideias_virais
ADD COLUMN IF NOT EXISTS categoria TEXT,
ADD COLUMN IF NOT EXISTS formato TEXT,
ADD COLUMN IF NOT EXISTS plataforma_alvo TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.ideias_virais.categoria IS 'Ex: Educacional, Humor, Opinião Contrária, Storytelling, Motivacional, Tutorial';
COMMENT ON COLUMN public.ideias_virais.formato IS 'Ex: Tutorial, POV, Lista, Reação, Desafio, Antes/Depois, Pergunta';
COMMENT ON COLUMN public.ideias_virais.plataforma_alvo IS 'Ex: TikTok, YouTube, Instagram Reels, LinkedIn, Twitter';

-- 2. CRIAR TABELA PERFORMANCE_CONTEUDO
CREATE TABLE IF NOT EXISTS public.performance_conteudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ideia_id UUID NOT NULL REFERENCES public.ideias_virais(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Métricas básicas de engajamento
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    
    -- Métricas avançadas de retenção
    retention_rate_3s FLOAT DEFAULT 0.0,
    retention_rate_15s FLOAT DEFAULT 0.0,
    retention_rate_30s FLOAT DEFAULT 0.0,
    average_watch_time FLOAT DEFAULT 0.0,
    
    -- Métricas de conversão
    click_through_rate FLOAT DEFAULT 0.0,
    conversion_rate FLOAT DEFAULT 0.0,
    
    -- Dados temporais
    posted_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadados da plataforma
    platform_specific_data JSONB DEFAULT '{}',
    
    -- Garantir que cada ideia tenha apenas um registro de performance
    UNIQUE(ideia_id)
);

-- Comentário da tabela
COMMENT ON TABLE public.performance_conteudo IS 'Armazena as métricas de performance de um conteúdo gerado no NEURA após ser postado nas redes sociais. Base para análises preditivas.';

-- Comentários das colunas
COMMENT ON COLUMN public.performance_conteudo.retention_rate_3s IS 'Taxa de retenção nos primeiros 3 segundos (crítico para algoritmos)';
COMMENT ON COLUMN public.performance_conteudo.retention_rate_15s IS 'Taxa de retenção aos 15 segundos';
COMMENT ON COLUMN public.performance_conteudo.retention_rate_30s IS 'Taxa de retenção aos 30 segundos';
COMMENT ON COLUMN public.performance_conteudo.average_watch_time IS 'Tempo médio de visualização em segundos';
COMMENT ON COLUMN public.performance_conteudo.platform_specific_data IS 'Dados específicos da plataforma (hashtags, localização, etc.)';

-- 3. HABILITAR RLS NA NOVA TABELA
ALTER TABLE public.performance_conteudo ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA PERFORMANCE_CONTEUDO
CREATE POLICY "Users can view own content performance"
  ON public.performance_conteudo FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own content performance"
  ON public.performance_conteudo FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content performance"
  ON public.performance_conteudo FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. ÍNDICES PARA OTIMIZAÇÃO
-- Índices para ideias_virais (novas colunas)
CREATE INDEX IF NOT EXISTS idx_ideias_virais_categoria ON public.ideias_virais(categoria);
CREATE INDEX IF NOT EXISTS idx_ideias_virais_formato ON public.ideias_virais(formato);
CREATE INDEX IF NOT EXISTS idx_ideias_virais_plataforma ON public.ideias_virais(plataforma_alvo);

-- Índices compostos para análises
CREATE INDEX IF NOT EXISTS idx_ideias_virais_user_categoria_data 
  ON public.ideias_virais(user_id, categoria, created_at);

CREATE INDEX IF NOT EXISTS idx_ideias_virais_formato_plataforma 
  ON public.ideias_virais(formato, plataforma_alvo);

-- Índices para performance_conteudo
CREATE INDEX IF NOT EXISTS idx_performance_user_id ON public.performance_conteudo(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_ideia_id ON public.performance_conteudo(ideia_id);
CREATE INDEX IF NOT EXISTS idx_performance_posted_at ON public.performance_conteudo(posted_at);
CREATE INDEX IF NOT EXISTS idx_performance_views ON public.performance_conteudo(views);
CREATE INDEX IF NOT EXISTS idx_performance_engagement 
  ON public.performance_conteudo(likes, comments, shares);

-- 6. FUNÇÃO PARA CALCULAR SCORE DE PERFORMANCE
CREATE OR REPLACE FUNCTION public.calculate_performance_score(
  p_views INT,
  p_likes INT,
  p_comments INT,
  p_shares INT,
  p_retention_3s FLOAT
)
RETURNS FLOAT AS $$
BEGIN
  -- Fórmula ponderada para score de performance
  -- Pode ser ajustada conforme aprendemos mais sobre o que funciona
  RETURN (
    (p_views * 0.1) +
    (p_likes * 0.2) +
    (p_comments * 0.3) +
    (p_shares * 0.4) +
    (p_retention_3s * 100 * 0.5)
  ) / 5.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. VIEW PARA ANÁLISES RÁPIDAS
CREATE OR REPLACE VIEW public.content_analytics AS
SELECT 
  iv.id,
  iv.user_id,
  iv.conteudo,
  iv.categoria,
  iv.formato,
  iv.plataforma_alvo,
  iv.created_at,
  pc.views,
  pc.likes,
  pc.comments,
  pc.shares,
  pc.retention_rate_3s,
  pc.average_watch_time,
  calculate_performance_score(
    pc.views, 
    pc.likes, 
    pc.comments, 
    pc.shares, 
    pc.retention_rate_3s
  ) as performance_score,
  pc.posted_at,
  pc.collected_at
FROM public.ideias_virais iv
LEFT JOIN public.performance_conteudo pc ON iv.id = pc.ideia_id;

-- Comentário da view
COMMENT ON VIEW public.content_analytics IS 'View consolidada para análises de performance de conteúdo. Combina ideias geradas com suas métricas de performance.';

-- 8. FUNÇÃO PARA INSIGHTS BÁSICOS
CREATE OR REPLACE FUNCTION public.get_user_content_insights(
  user_uuid UUID DEFAULT auth.uid(),
  days_back INT DEFAULT 30
)
RETURNS TABLE(
  best_categoria TEXT,
  best_formato TEXT,
  best_plataforma TEXT,
  avg_performance_score FLOAT,
  total_content_pieces INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT categoria FROM public.content_analytics 
     WHERE user_id = user_uuid 
       AND created_at >= (NOW() - INTERVAL '1 day' * days_back)
       AND performance_score IS NOT NULL
     ORDER BY performance_score DESC 
     LIMIT 1) as best_categoria,
     
    (SELECT formato FROM public.content_analytics 
     WHERE user_id = user_uuid 
       AND created_at >= (NOW() - INTERVAL '1 day' * days_back)
       AND performance_score IS NOT NULL
     ORDER BY performance_score DESC 
     LIMIT 1) as best_formato,
     
    (SELECT plataforma_alvo FROM public.content_analytics 
     WHERE user_id = user_uuid 
       AND created_at >= (NOW() - INTERVAL '1 day' * days_back)
       AND performance_score IS NOT NULL
     ORDER BY performance_score DESC 
     LIMIT 1) as best_plataforma,
     
    (SELECT AVG(performance_score) FROM public.content_analytics 
     WHERE user_id = user_uuid 
       AND created_at >= (NOW() - INTERVAL '1 day' * days_back)
       AND performance_score IS NOT NULL) as avg_performance_score,
       
    (SELECT COUNT(*) FROM public.ideias_virais 
     WHERE user_id = user_uuid 
       AND created_at >= (NOW() - INTERVAL '1 day' * days_back))::INT as total_content_pieces;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;