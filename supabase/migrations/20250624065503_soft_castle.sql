/*
  # Create mindmap pages table

  1. New Tables
    - `mindmap_pages`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, nullable)
      - `nodes` (jsonb, stores the mindmap structure)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
      - `user_id` (uuid, nullable for now - can be linked to auth later)

  2. Security
    - Enable RLS on `mindmap_pages` table
    - Add policy for public access (can be restricted later when auth is added)

  3. Indexes
    - Add index on created_at for sorting
    - Add index on user_id for future user-based queries
*/

CREATE TABLE IF NOT EXISTS mindmap_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Mindmap',
  description text,
  nodes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Enable Row Level Security
ALTER TABLE mindmap_pages ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public access to mindmap pages"
  ON mindmap_pages
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_created_at ON mindmap_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_user_id ON mindmap_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_updated_at ON mindmap_pages(updated_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_mindmap_pages_updated_at
  BEFORE UPDATE ON mindmap_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();