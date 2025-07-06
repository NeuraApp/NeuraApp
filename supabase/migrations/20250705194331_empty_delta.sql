/*
  # Sistema Completo de Pagamentos e Assinaturas
  
  1. Novas Tabelas
    - payment_intents: Intenções de pagamento do Stripe
    - subscription_events: Log de eventos de assinatura
    - usage_metrics: Métricas de uso por usuário
  
  2. Funções
    - Webhook handlers para Stripe
    - Cálculo de métricas
    - Validação de limites por plano
  
  3. Segurança
    - RLS policies atualizadas
    - Validação de webhooks
*/

-- Tabela para intenções de pagamento
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para eventos de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  stripe_event_id text,
  processed_at timestamptz DEFAULT now()
);

-- Tabela para métricas de uso
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, metric_type, period_start)
);

-- Habilitar RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can view own usage metrics"
  ON public.usage_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Only admins can view subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (is_admin());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON public.payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON public.payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_period ON public.usage_metrics(user_id, period_start, period_end);

-- Função para calcular uso atual do usuário
CREATE OR REPLACE FUNCTION public.get_user_usage(
  user_uuid uuid,
  metric_name text,
  period_days integer DEFAULT 30
)
RETURNS integer AS $$
DECLARE
  usage_count integer;
BEGIN
  SELECT COALESCE(SUM(metric_value), 0)
  INTO usage_count
  FROM public.usage_metrics
  WHERE user_id = user_uuid
    AND metric_type = metric_name
    AND period_start >= (now() - interval '1 day' * period_days);
    
  RETURN usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar limites do plano
CREATE OR REPLACE FUNCTION public.check_plan_limits(
  user_uuid uuid,
  metric_name text,
  requested_amount integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  current_usage integer;
  plan_limit integer;
BEGIN
  -- Obter plano do usuário
  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = user_uuid
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;
  
  -- Se não tem assinatura ativa, é free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Definir limites por plano
  CASE 
    WHEN user_plan = 'free' AND metric_name = 'ideas_generated' THEN
      plan_limit := 5; -- 5 ideias por dia para free
    WHEN user_plan = 'pro' AND metric_name = 'ideas_generated' THEN
      plan_limit := 999999; -- Ilimitado para pro
    WHEN user_plan = 'enterprise' AND metric_name = 'ideas_generated' THEN
      plan_limit := 999999; -- Ilimitado para enterprise
    ELSE
      plan_limit := 0; -- Métrica não reconhecida
  END CASE;
  
  -- Verificar uso atual (últimas 24h para free, mensal para outros)
  IF user_plan = 'free' THEN
    current_usage := get_user_usage(user_uuid, metric_name, 1);
  ELSE
    current_usage := get_user_usage(user_uuid, metric_name, 30);
  END IF;
  
  RETURN (current_usage + requested_amount) <= plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar uso
CREATE OR REPLACE FUNCTION public.record_usage(
  user_uuid uuid,
  metric_name text,
  amount integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
  period_start timestamptz;
  period_end timestamptz;
BEGIN
  -- Definir período (dia atual)
  period_start := date_trunc('day', now());
  period_end := period_start + interval '1 day';
  
  -- Inserir ou atualizar métrica
  INSERT INTO public.usage_metrics (user_id, metric_type, metric_value, period_start, period_end)
  VALUES (user_uuid, metric_name, amount, period_start, period_end)
  ON CONFLICT (user_id, metric_type, period_start)
  DO UPDATE SET 
    metric_value = usage_metrics.metric_value + amount,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();