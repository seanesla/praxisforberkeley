-- Add missing columns to documents table

-- Add file_size column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add page_count column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS page_count INTEGER;

-- Add index for file_size to enable efficient filtering
CREATE INDEX IF NOT EXISTS idx_documents_file_size ON documents(file_size);

-- Add index for title search
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

-- Update column comments
COMMENT ON COLUMN documents.file_size IS 'Size of the uploaded file in bytes';
COMMENT ON COLUMN documents.page_count IS 'Number of pages in the document (for PDFs)';