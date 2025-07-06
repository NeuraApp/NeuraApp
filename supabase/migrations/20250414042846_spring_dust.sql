/*
  # Add favorites support to ideias_virais table
  
  1. Changes
    - Add favorito column to ideias_virais table
    - Add index for faster favorite filtering
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add favorito column
DO $$ 
BEGIN
  ALTER TABLE ideias_virais
  ADD COLUMN IF NOT EXISTS favorito boolean DEFAULT false;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create index for favorito column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_ideias_virais_favorito'
  ) THEN
    CREATE INDEX idx_ideias_virais_favorito ON ideias_virais(favorito);
  END IF;
END $$;