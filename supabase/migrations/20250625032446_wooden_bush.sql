/*
  # Update RLS policies for authenticated users

  1. Security Changes
    - Drop the public access policy
    - Add policies for authenticated users only
    - Users can only access their own mindmaps

  2. Policies
    - Users can create their own mindmaps
    - Users can read their own mindmaps
    - Users can update their own mindmaps
    - Users can delete their own mindmaps
*/

-- Drop the existing public policy
DROP POLICY IF EXISTS "Allow public access to mindmap pages" ON mindmap_pages;

-- Create policies for authenticated users
CREATE POLICY "Users can create their own mindmaps"
  ON mindmap_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own mindmaps"
  ON mindmap_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own mindmaps"
  ON mindmap_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mindmaps"
  ON mindmap_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);