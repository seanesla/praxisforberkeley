-- Citation Network Analysis Tables

-- Citations table
CREATE TABLE IF NOT EXISTS citations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Citation details
  citation_text TEXT NOT NULL,
  citation_type VARCHAR(50), -- academic, web, book, article, etc.
  
  -- Extracted metadata
  authors TEXT[],
  title TEXT,
  publication_year INTEGER,
  publication_name TEXT,
  doi TEXT,
  url TEXT,
  
  -- Position in document
  page_number INTEGER,
  paragraph_index INTEGER,
  character_offset INTEGER,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citation relationships table
CREATE TABLE IF NOT EXISTS citation_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  citing_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  cited_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  citation_id UUID REFERENCES citations(id) ON DELETE CASCADE,
  
  relationship_type VARCHAR(50) DEFAULT 'cites', -- cites, extends, contradicts, supports
  strength FLOAT DEFAULT 1.0, -- Relationship strength 0-1
  
  context TEXT, -- Surrounding text for context
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(citing_document_id, cited_document_id, citation_id)
);

-- Citation clusters table (groups of related citations)
CREATE TABLE IF NOT EXISTS citation_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  cluster_name VARCHAR(255),
  cluster_type VARCHAR(50), -- topic, author, timeline, methodology
  
  -- Cluster metrics
  document_count INTEGER DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  
  -- Central topics/themes
  main_topics TEXT[],
  keywords TEXT[],
  
  -- Visualization data
  layout_data JSONB, -- Positions for network visualization
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citation cluster members
CREATE TABLE IF NOT EXISTS citation_cluster_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES citation_clusters(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Member metrics
  centrality_score FLOAT, -- How central this document is in the cluster
  connection_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(cluster_id, document_id)
);

-- Document similarity matrix (for citation network)
CREATE TABLE IF NOT EXISTS document_similarities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id_1 UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_id_2 UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Similarity metrics
  citation_similarity FLOAT, -- Based on shared citations
  content_similarity FLOAT, -- Based on content
  topic_similarity FLOAT, -- Based on topics
  overall_similarity FLOAT, -- Combined score
  
  -- Shared elements
  shared_citations INTEGER DEFAULT 0,
  shared_authors TEXT[],
  shared_topics TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT doc_order CHECK (document_id_1 < document_id_2),
  UNIQUE(document_id_1, document_id_2)
);

-- Create indexes
CREATE INDEX idx_citations_source_document ON citations(source_document_id);
CREATE INDEX idx_citations_doi ON citations(doi);
CREATE INDEX idx_citation_relationships_citing ON citation_relationships(citing_document_id);
CREATE INDEX idx_citation_relationships_cited ON citation_relationships(cited_document_id);
CREATE INDEX idx_citation_clusters_user_id ON citation_clusters(user_id);
CREATE INDEX idx_citation_cluster_members_cluster ON citation_cluster_members(cluster_id);
CREATE INDEX idx_document_similarities_doc1 ON document_similarities(document_id_1);
CREATE INDEX idx_document_similarities_doc2 ON document_similarities(document_id_2);

-- Enable RLS
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_similarities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view citations in their documents" ON citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = citations.source_document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view citation relationships for their documents" ON citation_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id IN (citing_document_id, cited_document_id)
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own citation clusters" ON citation_clusters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view cluster members for their clusters" ON citation_cluster_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM citation_clusters
      WHERE citation_clusters.id = citation_cluster_members.cluster_id
      AND citation_clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view similarities for their documents" ON document_similarities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id IN (document_id_1, document_id_2)
      AND documents.user_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_citation_clusters_updated_at BEFORE UPDATE ON citation_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();