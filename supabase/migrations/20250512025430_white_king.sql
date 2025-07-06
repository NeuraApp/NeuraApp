/*
  # Limpeza de dados e reset do sistema
  
  1. Ações
    - Limpar dados existentes
    - Manter estrutura
    - Verificar integridade
  
  2. Segurança
    - Manter políticas RLS
    - Preservar constraints
*/

-- Limpar dados mantendo estrutura
TRUNCATE TABLE public.ideias_virais CASCADE;
TRUNCATE TABLE public.logs CASCADE;
TRUNCATE TABLE public.analytics CASCADE;

-- Verificar e atualizar sequências
ALTER SEQUENCE IF EXISTS public.ideias_virais_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.analytics_id_seq RESTART WITH 1;

-- Verificar integridade das tabelas
ANALYZE public.ideias_virais;
ANALYZE public.logs;
ANALYZE public.analytics;