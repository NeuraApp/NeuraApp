/*
  # Fase 3: Cérebro Preditivo - Sistema de Tendências
  
  1. Nova Tabela
    - tendencias_globais: Repositório central de tendências coletadas
  
  2. Modificações
    - Adicionar coluna tendencia_utilizada em ideias_virais
  
  3. Índices
    - Otimização para queries de tendências
*/

-- 1. CRIAR TABELA TENDENCIAS_GLOBAIS
CREATE TABLE IF NOT EXISTS public.tendencias_globais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte TEXT NOT NULL, -- Ex: 'google_trends_rising', 'tiktok_sound'
    item_nome TEXT NOT NULL, -- Ex: 'receita de pao de queijo', 'som_viral_xyz.mp3'
    item_valor NUMERIC, -- Ex: Valor do interesse de busca no Google Trends
    regiao TEXT, -- Ex: 'BR'
    categoria_nicho TEXT, -- Ex: 'Culinária', 'Finanças'
    growth_rate FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'emerging', 'peaking', 'saturated')),
    data_coleta TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(fonte, item_nome, regiao, data_coleta)
);

-- Comentários
COMMENT ON TABLE public.tendencias_globais IS 'Armazena dados brutos sobre tendências coletadas da internet.';
COMMENT ON COLUMN public.tendencias_globais.fonte IS 'Origem dos dados: google_trends_rising, tiktok_sound, etc.';
COMMENT ON COLUMN public.tendencias_globais.item_nome IS 'Nome/descrição da tendência';
COMMENT ON COLUMN public.tendencias_globais.item_valor IS 'Valor numérico da popularidade/interesse';
COMMENT ON COLUMN public.tendencias_globais.growth_rate IS 'Taxa de crescimento calculada';
COMMENT ON COLUMN public.tendencias_globais.status IS 'Estágio da tendência: new, emerging, peaking, saturated';

-- 2. ADICIONAR COLUNA EM IDEIAS_VIRAIS
ALTER TABLE public.ideias_virais
ADD COLUMN IF NOT EXISTS tendencia_utilizada TEXT;

COMMENT ON COLUMN public.ideias_virais.tendencia_utilizada IS 'Nome da tendência emergente utilizada na geração da ideia';

-- 3. HABILITAR RLS
ALTER TABLE public.tendencias_globais ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA TENDENCIAS_GLOBAIS
-- Todos podem ler tendências (dados públicos)
CREATE POLICY "Anyone can read trends"
  ON public.tendencias_globais FOR SELECT
  TO public
  USING (true);

-- Apenas sistema pode inserir/atualizar
CREATE POLICY "Only system can modify trends"
  ON public.tendencias_globais FOR ALL
  USING (false);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tendencias_status ON public.tendencias_globais(status);
CREATE INDEX IF NOT EXISTS idx_tendencias_categoria ON public.tendencias_globais(categoria_nicho);
CREATE INDEX IF NOT EXISTS idx_tendencias_data_coleta ON public.tendencias_globais(data_coleta);
CREATE INDEX IF NOT EXISTS idx_tendencias_fonte ON public.tendencias_globais(fonte);
CREATE INDEX IF NOT EXISTS idx_tendencias_growth_rate ON public.tendencias_globais(growth_rate DESC);

-- Índice composto para busca de tendências emergentes por categoria
CREATE INDEX IF NOT EXISTS idx_tendencias_emerging_categoria 
  ON public.tendencias_globais(status, categoria_nicho, growth_rate DESC)
  WHERE status = 'emerging';

-- Índice para análise temporal
CREATE INDEX IF NOT EXISTS idx_tendencias_item_temporal 
  ON public.tendencias_globais(item_nome, data_coleta DESC);

-- 6. FUNÇÃO PARA CALCULAR VELOCIDADE E ACELERAÇÃO
CREATE OR REPLACE FUNCTION public.calculate_trend_metrics(
  trend_name TEXT,
  fonte_param TEXT,
  regiao_param TEXT DEFAULT 'BR'
)
RETURNS TABLE(
  velocidade FLOAT,
  aceleracao FLOAT,
  status_sugerido TEXT
) AS $$
DECLARE
  valores FLOAT[];
  hoje FLOAT;
  ontem FLOAT;
  anteontem FLOAT;
  vel_atual FLOAT;
  vel_anterior FLOAT;
  acel FLOAT;
BEGIN
  -- Buscar últimos 3 valores para o item
  SELECT ARRAY(
    SELECT item_valor::FLOAT
    FROM public.tendencias_globais
    WHERE item_nome = trend_name
      AND fonte = fonte_param
      AND regiao = regiao_param
    ORDER BY data_coleta DESC
    LIMIT 3
  ) INTO valores;
  
  -- Se não temos dados suficientes, retornar zeros
  IF array_length(valores, 1) < 2 THEN
    RETURN QUERY SELECT 0.0::FLOAT, 0.0::FLOAT, 'new'::TEXT;
    RETURN;
  END IF;
  
  hoje := valores[1];
  ontem := valores[2];
  
  -- Calcular velocidade (mudança de hoje para ontem)
  vel_atual := hoje - ontem;
  
  -- Se temos 3 pontos, calcular aceleração
  IF array_length(valores, 1) >= 3 THEN
    anteontem := valores[3];
    vel_anterior := ontem - anteontem;
    acel := vel_atual - vel_anterior;
  ELSE
    acel := 0.0;
  END IF;
  
  -- Determinar status baseado na velocidade e aceleração
  DECLARE
    status_calc TEXT;
  BEGIN
    IF vel_atual > 0 AND acel > 0 THEN
      status_calc := 'emerging';
    ELSIF vel_atual > 0 AND acel <= 0 THEN
      status_calc := 'peaking';
    ELSE
      status_calc := 'saturated';
    END IF;
    
    RETURN QUERY SELECT vel_atual, acel, status_calc;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA BUSCAR TENDÊNCIAS EMERGENTES POR CATEGORIA
CREATE OR REPLACE FUNCTION public.get_emerging_trends(
  categoria_param TEXT DEFAULT NULL,
  limite INT DEFAULT 5
)
RETURNS TABLE(
  item_nome TEXT,
  categoria_nicho TEXT,
  growth_rate FLOAT,
  item_valor NUMERIC,
  data_coleta TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.item_nome,
    t.categoria_nicho,
    t.growth_rate,
    t.item_valor,
    t.data_coleta
  FROM public.tendencias_globais t
  WHERE t.status = 'emerging'
    AND (categoria_param IS NULL OR t.categoria_nicho = categoria_param)
    AND t.data_coleta >= NOW() - INTERVAL '7 days'
  ORDER BY t.growth_rate DESC, t.item_valor DESC
  LIMIT limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VIEW PARA ANÁLISE DE TENDÊNCIAS
CREATE OR REPLACE VIEW public.trend_analysis AS
SELECT 
  t.item_nome,
  t.categoria_nicho,
  t.status,
  t.growth_rate,
  COUNT(*) OVER (PARTITION BY t.item_nome) as data_points,
  FIRST_VALUE(t.item_valor) OVER (
    PARTITION BY t.item_nome 
    ORDER BY t.data_coleta DESC
  ) as valor_atual,
  FIRST_VALUE(t.data_coleta) OVER (
    PARTITION BY t.item_nome 
    ORDER BY t.data_coleta DESC
  ) as ultima_coleta,
  AVG(t.item_valor) OVER (
    PARTITION BY t.item_nome 
    ORDER BY t.data_coleta 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as media_7_dias
FROM public.tendencias_globais t
WHERE t.data_coleta >= NOW() - INTERVAL '30 days';

COMMENT ON VIEW public.trend_analysis IS 'Análise consolidada de tendências com métricas calculadas';