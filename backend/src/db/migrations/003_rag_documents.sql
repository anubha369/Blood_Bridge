-- ============================================================================
-- BloodBridge Vision-X RAG Pipeline Schema
-- Migration: 003_rag_documents.sql
-- Description: Stores approved knowledge documents, text chunks, and vector embeddings
-- ============================================================================

-- Attempt to enable pgvector extension if available in Supabase/PostgreSQL environment
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not installed or permission denied; using JSONB fallback for embeddings.';
END $$;

-- 1. RAG Documents Table
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'guidance' CHECK (category IN ('eligibility', 'faq', 'workflow', 'guidelines', 'blood_bank_info')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    content TEXT NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RAG Document Chunks Table
CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INTEGER,
    -- Store embedding as JSONB array of floats (or vector type if pgvector is enabled)
    embedding JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(status);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON rag_chunks(document_id);

-- 3. Row Level Security Policies (Supabase RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Anonymous/Authenticated Public can view verified blood banks
CREATE POLICY "Public can view verified blood banks" 
ON blood_banks FOR SELECT 
USING (verification_status = 'verified');

-- Requesters can see their own requests
CREATE POLICY "Users can manage their own requests" 
ON blood_requests FOR ALL 
USING (auth.uid() = requester_id);

-- Donors can view and update their own donor profile
CREATE POLICY "Donors manage own profile" 
ON donors FOR ALL 
USING (auth.uid() = user_id);

-- RAG Approved docs are readable for retrieval
CREATE POLICY "Approved RAG documents readable" 
ON rag_documents FOR SELECT 
USING (status = 'approved');
