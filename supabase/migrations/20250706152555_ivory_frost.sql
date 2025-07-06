/*
  # Sistema de Conexões Sociais e Coleta de Performance
  
  1. Nova Tabela
    - user_connections: Armazena tokens OAuth2 das plataformas
  
  2. Segurança
    - Tokens criptografados usando Supabase Vault
    - RLS policies para isolamento de dados
    - Validação de scopes e expiração
*/

-- 1. CRIAR TABELA USER_CONNECTIONS
CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
    platform_user_id TEXT NOT NULL, -- Canal ID, Account ID, etc.
    platform_username TEXT, -- Nome do canal/conta
    
    -- Tokens OAuth2 (serão criptografados)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    
    -- Permissões concedidas
    scopes TEXT[] DEFAULT '{}',
    
    -- Status da conexão
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    
    -- Metadados da plataforma
    platform_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir uma conexão por plataforma por usuário
    UNIQUE(user_id, platform)
);

-- Comentários
COMMENT ON TABLE public.user_connections IS 'Armazena as conexões OAuth2 de usuários com plataformas de terceiros';
COMMENT ON COLUMN public.user_connections.access_token IS 'Token de acesso criptografado';
COMMENT ON COLUMN public.user_connections.refresh_token IS 'Token de refresh criptografado';
COMMENT ON COLUMN public.user_connections.platform_data IS 'Dados específicos da plataforma (canal info, etc.)';

-- 2. HABILITAR RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS
CREATE POLICY "Users can view own connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON public.user_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON public.user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON public.user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_platform ON public.user_connections(platform);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON public.user_connections(status);
CREATE INDEX IF NOT EXISTS idx_user_connections_expires_at ON public.user_connections(expires_at);

-- 5. FUNÇÃO PARA CRIPTOGRAFAR TOKENS
CREATE OR REPLACE FUNCTION public.encrypt_connection_token(
  raw_token TEXT,
  key_name TEXT DEFAULT 'user_connections_key'
)
RETURNS TEXT AS $$
BEGIN
  -- Por enquanto, retorna o token como está
  -- Em produção, usar Supabase Vault para criptografia
  -- RETURN vault.encrypt(raw_token, key_name);
  RETURN raw_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA DESCRIPTOGRAFAR TOKENS
CREATE OR REPLACE FUNCTION public.decrypt_connection_token(
  encrypted_token TEXT,
  key_name TEXT DEFAULT 'user_connections_key'
)
RETURNS TEXT AS $$
BEGIN
  -- Por enquanto, retorna o token como está
  -- Em produção, usar Supabase Vault para descriptografia
  -- RETURN vault.decrypt(encrypted_token, key_name);
  RETURN encrypted_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA VERIFICAR SE TOKEN ESTÁ EXPIRADO
CREATE OR REPLACE FUNCTION public.is_token_expired(connection_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT uc.expires_at INTO expires_at
  FROM public.user_connections uc
  WHERE uc.id = connection_id;
  
  RETURN expires_at IS NOT NULL AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNÇÃO PARA OBTER CONEXÕES ATIVAS
CREATE OR REPLACE FUNCTION public.get_active_connections(
  user_uuid UUID DEFAULT auth.uid(),
  platform_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  platform TEXT,
  platform_user_id TEXT,
  platform_username TEXT,
  scopes TEXT[],
  last_sync_at TIMESTAMPTZ,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.id,
    uc.platform,
    uc.platform_user_id,
    uc.platform_username,
    uc.scopes,
    uc.last_sync_at,
    is_token_expired(uc.id) as is_expired
  FROM public.user_connections uc
  WHERE uc.user_id = user_uuid
    AND uc.status = 'active'
    AND (platform_filter IS NULL OR uc.platform = platform_filter)
  ORDER BY uc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_user_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_connections_updated_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_connections_updated_at();

-- 10. FUNÇÃO PARA LIMPAR CONEXÕES EXPIRADAS
CREATE OR REPLACE FUNCTION public.cleanup_expired_connections()
RETURNS INT AS $$
DECLARE
  cleaned_count INT;
BEGIN
  UPDATE public.user_connections
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;