-- Enable Row Level Security on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (used by backend via Prisma)
-- This allows the Fastify backend to perform all operations via service_role key
CREATE POLICY "service_role_full_access"
  ON documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users via Supabase can access their own documents
-- Note: This won't work with custom JWT auth, but provides defense-in-depth
-- if you ever switch to Supabase Auth or use PostgREST
CREATE POLICY "authenticated_users_own_documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
