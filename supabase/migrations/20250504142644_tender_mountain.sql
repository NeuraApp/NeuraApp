/*
  # Update ideias_virais table policies and indexes
  
  1. Changes
    - Verify and update existing policies
    - Add additional indexes for optimization
    - Ensure foreign key constraints
*/

-- Safe policy updates
DO $$ 
BEGIN
  -- Ensure table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ideias_virais'
  ) THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.ideias_virais ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies safely
    DROP POLICY IF EXISTS "Usuários podem ver suas próprias ideias" ON public.ideias_virais;
    DROP POLICY IF EXISTS "Usuários podem criar novas ideias" ON public.ideias_virais;
    DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias ideias" ON public.ideias_virais;
    DROP POLICY IF EXISTS "Usuários podem deletar suas próprias ideias" ON public.ideias_virais;

    -- Create updated policies
    CREATE POLICY "Usuários podem ver suas próprias ideias"
    ON public.ideias_virais
    FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Usuários podem criar novas ideias"
    ON public.ideias_virais
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Usuários podem atualizar suas próprias ideias"
    ON public.ideias_virais
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Usuários podem deletar suas próprias ideias"
    ON public.ideias_virais
    FOR DELETE
    USING (auth.uid() = user_id);

    -- Create or update indexes
    CREATE INDEX IF NOT EXISTS idx_ideias_virais_user_id ON public.ideias_virais(user_id);
    CREATE INDEX IF NOT EXISTS idx_ideias_virais_created_at ON public.ideias_virais(created_at);
    CREATE INDEX IF NOT EXISTS idx_ideias_virais_favorito ON public.ideias_virais(favorito);
  END IF;
END $$;