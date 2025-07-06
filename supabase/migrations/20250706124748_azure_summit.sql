/*
  # Refatoração do Sistema de Assinaturas
  
  1. Criar tabela profiles com stripe_customer_id
  2. Refatorar tabela subscriptions para usar Stripe IDs
  3. Implementar RLS policies para controle de acesso
  4. Adicionar triggers e funções de segurança
*/

-- 1. CRIAR TABELA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. REFATORAR TABELA SUBSCRIPTIONS
-- Backup da tabela atual
CREATE TABLE IF NOT EXISTS public.subscriptions_backup AS 
SELECT * FROM public.subscriptions;

-- Recriar tabela com schema correto
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id text PRIMARY KEY, -- Stripe Subscription ID (sub_...)
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled', etc.
  price_id text NOT NULL, -- Stripe Price ID (price_...)
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. POLÍTICAS RLS PARA SUBSCRIPTIONS
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Only system can modify subscriptions"
  ON public.subscriptions FOR ALL
  USING (false); -- Apenas webhooks podem modificar

-- 6. FUNÇÃO PARA OBTER PLANO DO USUÁRIO
CREATE OR REPLACE FUNCTION public.get_user_plan(user_uuid uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  user_plan text;
BEGIN
  SELECT 
    CASE 
      WHEN s.status = 'active' AND s.current_period_end > now() THEN
        CASE s.price_id
          WHEN 'price_pro' THEN 'pro'
          WHEN 'price_enterprise' THEN 'enterprise'
          ELSE 'free'
        END
      ELSE 'free'
    END
  INTO user_plan
  FROM public.subscriptions s
  WHERE s.user_id = user_uuid;
  
  RETURN COALESCE(user_plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA VERIFICAR LIMITES
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  user_uuid uuid DEFAULT auth.uid(),
  limit_type text DEFAULT 'ideas_daily'
)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  current_usage integer;
  plan_limit integer;
  period_start timestamptz;
BEGIN
  -- Obter plano do usuário
  user_plan := get_user_plan(user_uuid);
  
  -- Definir período baseado no tipo de limite
  IF limit_type = 'ideas_daily' THEN
    period_start := date_trunc('day', now());
  ELSE
    period_start := date_trunc('month', now());
  END IF;
  
  -- Contar uso atual
  SELECT COUNT(*)
  INTO current_usage
  FROM public.ideias_virais
  WHERE user_id = user_uuid
    AND created_at >= period_start;
  
  -- Definir limites por plano
  plan_limit := CASE 
    WHEN user_plan = 'free' AND limit_type = 'ideas_daily' THEN 5
    WHEN user_plan IN ('pro', 'enterprise') THEN 999999
    ELSE 0
  END;
  
  RETURN current_usage < plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS POLICY PARA IDEIAS_VIRAIS COM LIMITES
DROP POLICY IF EXISTS "Users can insert own ideas" ON public.ideias_virais;

CREATE POLICY "Users can insert own ideas with limits"
  ON public.ideias_virais FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND check_usage_limit(auth.uid(), 'ideas_daily')
  );

-- 9. TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
  ON public.profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_ideias_virais_user_created 
  ON public.ideias_virais(user_id, created_at);

-- 11. FUNÇÃO PARA MIGRAR DADOS EXISTENTES
CREATE OR REPLACE FUNCTION public.migrate_existing_data()
RETURNS void AS $$
BEGIN
  -- Migrar profiles de user_metadata
  INSERT INTO public.profiles (id, full_name, avatar_url)
  SELECT 
    id,
    COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'nome', email),
    raw_user_meta_data->>'avatar_url'
  FROM auth.users
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
    
  -- Migrar subscriptions do backup (se existir)
  -- Nota: Dados do backup precisarão ser mapeados manualmente
  -- pois o schema mudou significativamente
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar migração
SELECT public.migrate_existing_data();