-- Migration for Advanced AI Features
-- Creates tables for summaries, document relationships, and document DNA

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Summary cache table
CREATE TABLE IF NOT EXISTS public.document_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  summary_level VARCHAR(50) NOT NULL CHECK (summary_level IN ('one_sentence', 'one_paragraph', 'one_page', 'key_points', 'outline')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, summary_level)
);

-- Document relationships table
CREATE TABLE IF NOT EXISTS public.document_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_doc_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  target_doc_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('references', 'contradicts', 'extends', 'summarizes', 'prerequisite', 'similar_to', 'part_of')),
  strength FLOAT CHECK (strength >= 0 AND strength <= 1),
  evidence JSONB DEFAULT '[]',
  auto_detected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_documents CHECK (source_doc_id != target_doc_id)
);

-- Document DNA table
CREATE TABLE IF NOT EXISTS public.document_dna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  fingerprint JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- Cross-document insights table
CREATE TABLE IF NOT EXISTS public.cross_document_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('theme', 'contradiction', 'progression', 'synthesis', 'gap')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  involved_documents UUID[] NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  insights JSONB DEFAULT '[]',
  visual_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concept network nodes table
CREATE TABLE IF NOT EXISTS public.concept_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('document', 'concept', 'theme')),
  size INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concept network edges table
CREATE TABLE IF NOT EXISTS public.concept_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES public.concept_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.concept_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_nodes CHECK (source_id != target_id)
);

-- RAG context cache table
CREATE TABLE IF NOT EXISTS public.rag_context_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  relevant_chunks JSONB NOT NULL,
  document_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_summaries_document_id ON public.document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_summaries_level ON public.document_summaries(summary_level);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON public.document_relationships(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON public.document_relationships(target_doc_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.document_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_dna_document_id ON public.document_dna(document_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.cross_document_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.cross_document_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_id ON public.concept_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_source ON public.concept_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_target ON public.concept_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_rag_cache_user_query ON public.rag_context_cache(user_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_rag_cache_expires ON public.rag_context_cache(expires_at);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_summaries_metadata_gin ON public.document_summaries USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_relationships_evidence_gin ON public.document_relationships USING GIN (evidence);
CREATE INDEX IF NOT EXISTS idx_dna_fingerprint_gin ON public.document_dna USING GIN (fingerprint);
CREATE INDEX IF NOT EXISTS idx_insights_insights_gin ON public.cross_document_insights USING GIN (insights);

-- Array indexes
CREATE INDEX IF NOT EXISTS idx_insights_documents_gin ON public.cross_document_insights USING GIN (involved_documents);
CREATE INDEX IF NOT EXISTS idx_rag_cache_documents_gin ON public.rag_context_cache USING GIN (document_ids);

-- Enable Row Level Security
ALTER TABLE public.document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_document_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_context_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_summaries
CREATE POLICY "Users can view summaries for their documents" ON public.document_summaries
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for document_relationships
CREATE POLICY "Users can view relationships for their documents" ON public.document_relationships
  FOR SELECT USING (
    source_doc_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    ) OR
    target_doc_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for document_dna
CREATE POLICY "Users can view DNA for their documents" ON public.document_dna
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for cross_document_insights
CREATE POLICY "Users can CRUD their own insights" ON public.cross_document_insights
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for concept_nodes
CREATE POLICY "Users can CRUD their own concept nodes" ON public.concept_nodes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for concept_edges
CREATE POLICY "Users can view edges for their nodes" ON public.concept_edges
  FOR SELECT USING (
    source_id IN (
      SELECT id FROM public.concept_nodes WHERE user_id = auth.uid()
    ) OR
    target_id IN (
      SELECT id FROM public.concept_nodes WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for rag_context_cache
CREATE POLICY "Users can CRUD their own RAG cache" ON public.rag_context_cache
  FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_document_summaries_updated_at BEFORE UPDATE ON public.document_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_relationships_updated_at BEFORE UPDATE ON public.document_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_dna_updated_at BEFORE UPDATE ON public.document_dna
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_document_insights_updated_at BEFORE UPDATE ON public.cross_document_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.document_summaries IS 'Stores AI-generated summaries at different levels for documents';
COMMENT ON TABLE public.document_relationships IS 'Tracks relationships between documents (references, contradictions, etc)';
COMMENT ON TABLE public.document_dna IS 'Stores document fingerprints for similarity analysis';
COMMENT ON TABLE public.cross_document_insights IS 'Stores insights derived from analyzing multiple documents';
COMMENT ON TABLE public.concept_nodes IS 'Nodes in the concept network graph';
COMMENT ON TABLE public.concept_edges IS 'Edges connecting concept nodes';
COMMENT ON TABLE public.rag_context_cache IS 'Caches RAG search results for performance';