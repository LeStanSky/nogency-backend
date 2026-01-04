-- Drop all RLS policies on documents table
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Service role has full access to documents" ON documents;

-- Disable Row Level Security on documents table
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
