/*
  # Add subscription management
  
  1. New Tables
    - subscriptions
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - plan (text): free, pro, enterprise
      - status (text): active, canceled, past_due
      - current_period_end (timestamptz)
      - created_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Only admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete subscriptions"
ON public.subscriptions
FOR DELETE
USING (is_admin());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Create function to check user's plan
CREATE OR REPLACE FUNCTION public.get_user_plan(user_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT plan
    FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND current_period_end > now()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;