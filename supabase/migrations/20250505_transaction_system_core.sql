
-- Core schema for the simplified transaction categorization system

-- Create tables for transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vendor TEXT,
  category TEXT,
  type TEXT DEFAULT 'expense',
  statement_type TEXT DEFAULT 'profit_loss',
  confidence_score NUMERIC,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  embedding vector(1536)
);

-- Create table for vendor categorization patterns
CREATE TABLE IF NOT EXISTS public.vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  statement_type TEXT NOT NULL DEFAULT 'profit_loss',
  sample_description TEXT,
  occurrence_count INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  embedding vector(1536)
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for vendor categories
CREATE POLICY "Anyone can view vendor categories"
  ON public.vendor_categories FOR SELECT
  USING (true);

CREATE POLICY "Users can insert vendor categories"
  ON public.vendor_categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update vendor categories"
  ON public.vendor_categories FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create function for semantic search of vendors
CREATE OR REPLACE FUNCTION match_vendors(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  vendor_name TEXT,
  category TEXT,
  type TEXT,
  statement_type TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.vendor_name,
    vc.category,
    vc.type,
    vc.statement_type,
    1 - (vc.embedding <=> query_embedding) AS similarity
  FROM public.vendor_categories vc
  WHERE 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger for updating the vendor_categories table when transactions are categorized
CREATE OR REPLACE FUNCTION update_vendor_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor IS NOT NULL THEN
    -- Insert or update the vendor_categories table
    INSERT INTO public.vendor_categories (
      vendor_name, 
      category, 
      type, 
      statement_type, 
      sample_description,
      occurrence_count
    )
    VALUES (
      NEW.vendor, 
      NEW.category, 
      NEW.type, 
      NEW.statement_type,
      NEW.description,
      1
    )
    ON CONFLICT (vendor_name)
    DO UPDATE SET 
      category = COALESCE(EXCLUDED.category, vendor_categories.category),
      type = COALESCE(EXCLUDED.type, vendor_categories.type),
      statement_type = COALESCE(EXCLUDED.statement_type, vendor_categories.statement_type),
      occurrence_count = vendor_categories.occurrence_count + 1,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_on_transaction
  AFTER INSERT OR UPDATE OF vendor, category, type, statement_type
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_category();
