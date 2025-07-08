/*
  # Sistema de Controle de Acesso Admin e Configurações do Sistema
  
  1. Novas Tabelas
    - system_preferences: Configurações globais editáveis apenas por admins
  
  2. Segurança
    - Função is_admin() para verificar role
    - RLS policies para proteger configurações
    - Controle de acesso baseado em JWT claims
*/

-- 1. TABELA PARA CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.system_preferences (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    llm_provider TEXT NOT NULL DEFAULT 'gemini-pro',
    system_prompt TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.system_preferences IS 'Armazena configurações globais editáveis apenas por administradores.';

-- 2. HABILITAR RLS
ALTER TABLE public.system_preferences ENABLE ROW LEVEL SECURITY;

-- 3. FUNÇÃO AUXILIAR PARA VERIFICAR ROLE DE ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT COALESCE(
    (auth.jwt()->>'user_role' = 'admin'),
    (auth.jwt()->'user_metadata'->>'role' = 'admin'),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Retorna true se o usuário autenticado tiver o claim "user_role" ou role no metadata como "admin".';

-- 4. POLÍTICAS DE SEGURANÇA (RLS POLICIES)
DROP POLICY IF EXISTS "Admins podem acessar as configurações" ON public.system_preferences;
CREATE POLICY "Admins podem acessar as configurações"
ON public.system_preferences FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. INSERIR CONFIGURAÇÃO INICIAL
INSERT INTO public.system_preferences (id, system_prompt)
VALUES (
  'global_config', 
  'Você é NEURA, uma IA especialista em conteúdo viral. Sua missão é gerar ideias, roteiros e legendas que maximizam engajamento e retenção. Responda sempre em formato JSON estruturado com os campos: "conteudo", "categoria", "formato", "plataforma_alvo", "tendencia_utilizada", "ganchos_sugeridos". Use gatilhos psicológicos comprovados e incorpore tendências emergentes quando disponíveis.'
)
ON CONFLICT (id) DO NOTHING;

-- 6. FUNÇÃO PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_system_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER PARA UPDATED_AT
CREATE TRIGGER update_system_preferences_updated_at
  BEFORE UPDATE ON public.system_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_preferences_updated_at();

-- 8. FUNÇÃO PARA OBTER CONFIGURAÇÕES DO SISTEMA
CREATE OR REPLACE FUNCTION public.get_system_config()
RETURNS TABLE(
  llm_provider TEXT,
  system_prompt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.llm_provider, sp.system_prompt
  FROM public.system_preferences sp
  WHERE sp.id = 'global_config';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;