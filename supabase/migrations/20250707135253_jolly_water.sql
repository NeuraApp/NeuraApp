/*
  # NEURA Fase 4: Killer Features
  
  1. Novas Tabelas
    - campanhas: Campanhas estratégicas de marketing
    - etapas_campanha: Etapas individuais de cada campanha
  
  2. Modificações
    - Adicionar campo ganchos_sugeridos em ideias_virais
  
  3. Segurança
    - RLS policies para isolamento de dados
    - Índices para performance
*/

-- 1. ADICIONAR CAMPO GANCHOS_SUGERIDOS EM IDEIAS_VIRAIS
ALTER TABLE public.ideias_virais
ADD COLUMN IF NOT EXISTS ganchos_sugeridos JSONB DEFAULT '[]';

COMMENT ON COLUMN public.ideias_virais.ganchos_sugeridos IS 'Array de objetos com ganchos A/B testados: [{texto_gancho, potencial_retencao_score, justificativa}]';

-- 2. CRIAR TABELA CAMPANHAS
CREATE TABLE IF NOT EXISTS public.campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objetivo_principal TEXT NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativa', 'concluida', 'pausada')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.campanhas IS 'Campanhas estratégicas de marketing com múltiplas etapas coordenadas';
COMMENT ON COLUMN public.campanhas.objetivo_principal IS 'Ex: Lançar meu curso de edição de vídeo';

-- 3. CRIAR TABELA ETAPAS_CAMPANHA
CREATE TABLE IF NOT EXISTS public.etapas_campanha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
    ideia_id UUID UNIQUE NOT NULL REFERENCES public.ideias_virais(id) ON DELETE CASCADE,
    ordem_etapa INT NOT NULL,
    objetivo_etapa TEXT NOT NULL, -- Ex: 'Teaser', 'Revelação', 'Prova Social'
    data_sugerida DATE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'publicado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.etapas_campanha IS 'Etapas individuais de uma campanha, cada uma ligada a uma ideia específica';
COMMENT ON COLUMN public.etapas_campanha.objetivo_etapa IS 'Ex: Teaser, Amostra de Valor, Anúncio do Lançamento, Depoimento, Última Chamada';

-- 4. HABILITAR RLS
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_campanha ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA CAMPANHAS
CREATE POLICY "Users can view own campaigns"
  ON public.campanhas FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own campaigns"
  ON public.campanhas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON public.campanhas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON public.campanhas FOR DELETE
  USING (auth.uid() = user_id);

-- 6. POLÍTICAS RLS PARA ETAPAS_CAMPANHA
CREATE POLICY "Users can view own campaign steps"
  ON public.etapas_campanha FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campanhas c 
      WHERE c.id = campanha_id AND (c.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Users can insert own campaign steps"
  ON public.etapas_campanha FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campanhas c 
      WHERE c.id = campanha_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaign steps"
  ON public.etapas_campanha FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campanhas c 
      WHERE c.id = campanha_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campanhas c 
      WHERE c.id = campanha_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign steps"
  ON public.etapas_campanha FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campanhas c 
      WHERE c.id = campanha_id AND c.user_id = auth.uid()
    )
  );

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_campanhas_user_id ON public.campanhas(user_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_data_inicio ON public.campanhas(data_inicio);

CREATE INDEX IF NOT EXISTS idx_etapas_campanha_id ON public.etapas_campanha(campanha_id);
CREATE INDEX IF NOT EXISTS idx_etapas_ordem ON public.etapas_campanha(campanha_id, ordem_etapa);
CREATE INDEX IF NOT EXISTS idx_etapas_data_sugerida ON public.etapas_campanha(data_sugerida);

-- Índice para busca de ideias com ganchos
CREATE INDEX IF NOT EXISTS idx_ideias_ganchos ON public.ideias_virais 
  USING GIN (ganchos_sugeridos) WHERE ganchos_sugeridos != '[]';

-- 8. FUNÇÃO PARA OBTER CAMPANHAS COM ETAPAS
CREATE OR REPLACE FUNCTION public.get_campaign_with_steps(
  campaign_id UUID,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE(
  campanha_id UUID,
  objetivo_principal TEXT,
  data_inicio DATE,
  data_fim DATE,
  status TEXT,
  etapa_id UUID,
  ordem_etapa INT,
  objetivo_etapa TEXT,
  ideia_conteudo TEXT,
  ideia_categoria TEXT,
  ideia_formato TEXT,
  data_sugerida DATE
) AS $$
BEGIN
  -- Verificar se o usuário tem acesso à campanha
  IF NOT EXISTS (
    SELECT 1 FROM public.campanhas c 
    WHERE c.id = campaign_id AND c.user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Acesso negado à campanha';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as campanha_id,
    c.objetivo_principal,
    c.data_inicio,
    c.data_fim,
    c.status,
    e.id as etapa_id,
    e.ordem_etapa,
    e.objetivo_etapa,
    i.conteudo as ideia_conteudo,
    i.categoria as ideia_categoria,
    i.formato as ideia_formato,
    e.data_sugerida
  FROM public.campanhas c
  LEFT JOIN public.etapas_campanha e ON c.id = e.campanha_id
  LEFT JOIN public.ideias_virais i ON e.ideia_id = i.id
  WHERE c.id = campaign_id
  ORDER BY e.ordem_etapa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. FUNÇÃO PARA CALCULAR SCORE MÉDIO DOS GANCHOS
CREATE OR REPLACE FUNCTION public.get_best_hook_score(
  ganchos_json JSONB
)
RETURNS FLOAT AS $$
DECLARE
  gancho JSONB;
  max_score FLOAT := 0;
BEGIN
  -- Se não há ganchos, retornar 0
  IF ganchos_json IS NULL OR jsonb_array_length(ganchos_json) = 0 THEN
    RETURN 0;
  END IF;
  
  -- Encontrar o maior score entre os ganchos
  FOR gancho IN SELECT * FROM jsonb_array_elements(ganchos_json)
  LOOP
    IF (gancho->>'potencial_retencao_score')::FLOAT > max_score THEN
      max_score := (gancho->>'potencial_retencao_score')::FLOAT;
    END IF;
  END LOOP;
  
  RETURN max_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. TRIGGER PARA UPDATED_AT EM CAMPANHAS
CREATE OR REPLACE FUNCTION public.update_campanhas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campanhas_updated_at
  BEFORE UPDATE ON public.campanhas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campanhas_updated_at();

-- 11. VIEW PARA ANÁLISE DE CAMPANHAS
CREATE OR REPLACE VIEW public.campaign_analytics AS
SELECT 
  c.id as campanha_id,
  c.objetivo_principal,
  c.status as campanha_status,
  c.data_inicio,
  c.data_fim,
  COUNT(e.id) as total_etapas,
  COUNT(CASE WHEN e.status = 'publicado' THEN 1 END) as etapas_publicadas,
  AVG(get_best_hook_score(i.ganchos_sugeridos)) as score_medio_ganchos,
  c.created_at,
  c.user_id
FROM public.campanhas c
LEFT JOIN public.etapas_campanha e ON c.id = e.campanha_id
LEFT JOIN public.ideias_virais i ON e.ideia_id = i.id
GROUP BY c.id, c.objetivo_principal, c.status, c.data_inicio, c.data_fim, c.created_at, c.user_id;

COMMENT ON VIEW public.campaign_analytics IS 'Análise consolidada de campanhas com métricas de performance';