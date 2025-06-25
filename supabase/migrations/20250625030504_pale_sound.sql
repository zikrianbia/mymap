/*
  # Create mindmap application database schema

  1. New Tables
    - `mindmap_pages`
      - `id` (uuid, primary key)
      - `title` (text, not null) - The title of the mindmap
      - `description` (text, nullable) - Optional description
      - `nodes` (jsonb, not null) - Stores the complete mindmap structure including nodes and layout
      - `created_at` (timestamptz, default now) - Creation timestamp
      - `updated_at` (timestamptz, default now) - Last modification timestamp
      - `user_id` (uuid, nullable) - For future user authentication integration

  2. Security
    - Enable RLS on `mindmap_pages` table
    - Add policy for public access (temporary - should be restricted when auth is added)
    - All users can create, read, update, and delete mindmaps for now

  3. Performance
    - Add indexes on frequently queried columns (created_at, updated_at, user_id)
    - Optimize for dashboard listing and individual mindmap loading

  4. Triggers
    - Automatic updated_at timestamp management
*/

-- Create the mindmap_pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS mindmap_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Mindmap',
  description text,
  nodes jsonb NOT NULL DEFAULT '{"nodes": {}, "rootNodeId": null}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Enable Row Level Security
ALTER TABLE mindmap_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mindmap_pages' 
    AND policyname = 'Allow public access to mindmap pages'
  ) THEN
    DROP POLICY "Allow public access to mindmap pages" ON mindmap_pages;
  END IF;
END $$;

-- Create policy for public access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public access to mindmap pages"
  ON mindmap_pages
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_created_at ON mindmap_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_updated_at ON mindmap_pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mindmap_pages_user_id ON mindmap_pages(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists, then create new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_mindmap_pages_updated_at'
  ) THEN
    DROP TRIGGER update_mindmap_pages_updated_at ON mindmap_pages;
  END IF;
END $$;

-- Create trigger to automatically update updated_at on any update
CREATE TRIGGER update_mindmap_pages_updated_at
  BEFORE UPDATE ON mindmap_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a sample mindmap for testing (only if no records exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mindmap_pages LIMIT 1) THEN
    INSERT INTO mindmap_pages (title, description, nodes) VALUES (
      'Welcome to Mindmaps',
      'Your first mindmap to get started',
      '{
        "nodes": {
          "root-sample": {
            "id": "root-sample",
            "title": "Welcome to Mindmaps",
            "position": {"x": 400, "y": 300},
            "color": "#3B82F6",
            "isCompleted": false,
            "isCollapsed": false,
            "parentId": null,
            "childrenIds": ["child-1", "child-2"],
            "level": 0,
            "isSelected": false,
            "isEditing": false
          },
          "child-1": {
            "id": "child-1",
            "title": "Getting Started",
            "position": {"x": 650, "y": 250},
            "color": "#10B981",
            "isCompleted": false,
            "isCollapsed": false,
            "parentId": "root-sample",
            "childrenIds": [],
            "level": 1,
            "isSelected": false,
            "isEditing": false
          },
          "child-2": {
            "id": "child-2",
            "title": "Features",
            "position": {"x": 650, "y": 350},
            "color": "#F97316",
            "isCompleted": false,
            "isCollapsed": false,
            "parentId": "root-sample",
            "childrenIds": [],
            "level": 1,
            "isSelected": false,
            "isEditing": false
          }
        },
        "rootNodeId": "root-sample"
      }'
    );
  END IF;
END $$;