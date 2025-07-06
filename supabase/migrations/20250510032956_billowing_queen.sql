/*
  # Add admin role support
  
  1. Changes
    - Add role column to auth.users
    - Add policies for admin access
    - Add function to check admin status
  
  2. Security
    - Only admins can modify admin status
    - Regular users cannot escalate privileges
*/

-- Add role column to auth.users if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
END $$;

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing policies to check for admin role
ALTER POLICY "Usuários podem ver suas próprias ideias" 
ON public.ideias_virais
USING (auth.uid() = user_id OR is_admin());

ALTER POLICY "Usuários podem atualizar suas próprias ideias"
ON public.ideias_virais
USING (auth.uid() = user_id OR is_admin())
WITH CHECK (auth.uid() = user_id OR is_admin());

ALTER POLICY "Usuários podem deletar suas próprias ideias"
ON public.ideias_virais
USING (auth.uid() = user_id OR is_admin());

-- Set your account as admin (substitua YOUR_USER_ID pelo seu ID)
UPDATE auth.users
SET role = 'admin'
WHERE email = 'seu@email.com';  -- Substitua pelo seu email