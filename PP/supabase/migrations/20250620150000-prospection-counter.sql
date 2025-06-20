-- Criar tabela para armazenar contadores diários de prospecção
CREATE TABLE public.prospection_counter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_prospection_counter_date ON public.prospection_counter(date);
CREATE INDEX idx_prospection_counter_created_at ON public.prospection_counter(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.prospection_counter ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir inserção pública
CREATE POLICY "Allow public insert on prospection_counter" 
  ON public.prospection_counter 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Criar política para permitir leitura pública
CREATE POLICY "Allow public select on prospection_counter" 
  ON public.prospection_counter 
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Criar política para permitir atualização pública
CREATE POLICY "Allow public update on prospection_counter" 
  ON public.prospection_counter 
  FOR UPDATE 
  TO anon, authenticated
  USING (true);

-- Trigger para atualizar automaticamente o updated_at
CREATE TRIGGER update_prospection_counter_updated_at
  BEFORE UPDATE ON public.prospection_counter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro para hoje se não existir
INSERT INTO public.prospection_counter (date, count, goal)
VALUES (CURRENT_DATE, 0, 100)
ON CONFLICT (date) DO NOTHING; 