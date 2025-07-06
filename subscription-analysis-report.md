# Relatório de Análise - Sistema de Assinaturas NEURA

## PARTE 1: ANÁLISE DO ESTADO ATUAL

### 1. ESTRUTURA DE DADOS

#### Tabela `profiles`
❌ **NÃO EXISTE** uma tabela `profiles` separada
- Os dados do usuário estão armazenados apenas em `auth.users.user_metadata`
- **FALTANDO**: `stripe_customer_id` não está sendo persistido

#### Tabela `subscriptions`
✅ **EXISTE** com schema:
```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text CHECK (plan IN ('free', 'pro', 'enterprise')),
  status text CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

**PROBLEMAS IDENTIFICADOS**:
- ❌ ID não é o Stripe Subscription ID (usa UUID próprio)
- ❌ Falta `price_id` do Stripe
- ❌ Falta `cancel_at_period_end`
- ❌ Não há referência ao `stripe_customer_id`

### 2. FLUXO DE PAGAMENTO

#### Criação do `stripe_customer_id`
✅ **IMPLEMENTADO** em `/functions/create-payment-intent/index.ts`:
```typescript
// Busca customer existente por email
const existingCustomers = await stripe.customers.list({
  email: user.email,
  limit: 1
});

// Cria novo se não existir
if (existingCustomers.data.length === 0) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.user_metadata?.nome || user.user_metadata?.name,
    metadata: { user_id: user.id }
  });
}
```

**PROBLEMA**: `stripe_customer_id` não é salvo no Supabase

#### Edge Function de Checkout
✅ **EXISTE** `/functions/create-payment-intent/index.ts`
- Cria PaymentIntent no Stripe
- Salva em `payment_intents` table
- **FALTANDO**: Não cria subscription no Stripe

### 3. SINCRONIZAÇÃO DE DADOS

#### Webhook do Stripe
✅ **EXISTE** `/functions/stripe-webhook/index.ts`

**Eventos Configurados**:
- ✅ `payment_intent.succeeded`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**PROBLEMAS**:
- ❌ Busca usuário por email (ineficiente)
- ❌ Não usa `stripe_customer_id` como referência
- ❌ Lógica de mapeamento de planos hardcoded
- ❌ Não trata todos os status do Stripe

### 4. CONTROLE DE ACESSO

#### Verificação de Plano
✅ **FRONTEND**: Hook `useSubscription` em `/src/hooks/useSubscription.ts`
```typescript
const { subscription, isActive, isPro, isEnterprise } = useSubscription();
```

**PROBLEMAS**:
- ❌ Verificação apenas no frontend (inseguro)
- ❌ Sem RLS para limites de uso
- ❌ Sem validação no backend

#### Limites de Uso
❌ **NÃO IMPLEMENTADO**:
- Sem RLS policies para limites
- Sem contagem de uso por período
- Verificação apenas no frontend

### 5. TABELAS AUXILIARES

#### `payment_intents`
✅ **EXISTE** - Para tracking de pagamentos

#### `usage_metrics`
✅ **EXISTE** - Para métricas de uso
- Tem função `check_plan_limits()`
- **PROBLEMA**: Não é usada nas RLS policies

## PARTE 2: PROBLEMAS CRÍTICOS IDENTIFICADOS

### 🔴 SEGURANÇA
1. Verificação de planos apenas no frontend
2. Sem RLS policies para limites de uso
3. Dados sensíveis em `user_metadata`

### 🔴 SINCRONIZAÇÃO
1. `stripe_customer_id` não persistido
2. Webhook busca por email (lento/inseguro)
3. Schema da tabela `subscriptions` incompatível com Stripe

### 🔴 ESCALABILIDADE
1. Sem cache de dados de assinatura
2. Queries ineficientes
3. Falta de índices otimizados

## PARTE 3: PLANO DE AÇÃO RECOMENDADO

### 1. CRIAR TABELA `profiles`
- Adicionar `stripe_customer_id`
- Trigger automático para novos usuários

### 2. REFATORAR TABELA `subscriptions`
- ID = Stripe Subscription ID
- Adicionar campos obrigatórios do Stripe
- Remover campos desnecessários

### 3. IMPLEMENTAR RLS POLICIES
- Limites por plano no banco
- Verificação automática de permissões

### 4. OTIMIZAR WEBHOOKS
- Busca por `stripe_customer_id`
- Tratamento completo de eventos
- Validação de assinatura

### 5. SEGURANÇA BACKEND
- Validação em Edge Functions
- Rate limiting por plano
- Logs de auditoria

## CONCLUSÃO

O sistema atual tem uma base sólida mas precisa de refatoração significativa para seguir o modelo "Fonte da Verdade". Os principais gaps são na sincronização Stripe-Supabase e na segurança de controle de acesso.

**Prioridade**: 🔴 ALTA - Problemas de segurança críticos