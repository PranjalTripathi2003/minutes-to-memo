-- Create transcriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add error_message column to recordings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE recordings ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Create summaries table if it doesn't exist  
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  title TEXT,
  main_points TEXT[],
  next_steps TEXT[],
  participants TEXT[],
  general_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 