
-- Criar tabela para armazenar execuções do webhook
CREATE TABLE public.webhook_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  response_message TEXT,
  response_data JSONB,
  http_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_webhook_executions_status ON public.webhook_executions(status);
CREATE INDEX idx_webhook_executions_created_at ON public.webhook_executions(created_at);
CREATE INDEX idx_webhook_executions_email ON public.webhook_executions(email);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.webhook_executions ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir inserção pública (para capturar todas as execuções)
CREATE POLICY "Allow public insert on webhook_executions" 
  ON public.webhook_executions 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Criar política para permitir leitura pública (para visualizar execuções)
CREATE POLICY "Allow public select on webhook_executions" 
  ON public.webhook_executions 
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Função para atualizar automatically o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar automaticamente o updated_at
CREATE TRIGGER update_webhook_executions_updated_at
  BEFORE UPDATE ON public.webhook_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
