-- Criar tabela para armazenar contatos únicos das prospecções
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prospectado' CHECK (status IN ('prospectado', 'interessado', 'nao_interessado', 'convertido', 'bloqueado')),
  source TEXT NOT NULL DEFAULT 'prospecção',
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  last_contact_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_contact_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para evitar duplicatas por telefone (principal identificador)
  CONSTRAINT unique_phone UNIQUE (phone),
  
  -- Constraint para evitar duplicatas por email (secundário)
  CONSTRAINT unique_email UNIQUE (email)
);

-- Criar índices para melhor performance
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_last_contact ON public.contacts(last_contact_date);
CREATE INDEX idx_contacts_name ON public.contacts USING gin(to_tsvector('portuguese', name));

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir inserção pública
CREATE POLICY "Allow public insert on contacts" 
  ON public.contacts 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Criar política para permitir leitura pública
CREATE POLICY "Allow public select on contacts" 
  ON public.contacts 
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Criar política para permitir atualização pública
CREATE POLICY "Allow public update on contacts" 
  ON public.contacts 
  FOR UPDATE 
  TO anon, authenticated
  USING (true);

-- Trigger para atualizar automaticamente o updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para lidar com upsert de contatos (inserir ou atualizar se existir)
CREATE OR REPLACE FUNCTION public.upsert_contact(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_source TEXT DEFAULT 'prospecção'
) RETURNS public.contacts AS $$
DECLARE
  result_contact public.contacts;
  clean_phone TEXT;
BEGIN
  -- Limpar e normalizar telefone (remover caracteres especiais)
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Se o telefone não começar com 55, adicionar
  IF clean_phone !~ '^55' AND length(clean_phone) >= 10 THEN
    clean_phone := '55' || clean_phone;
  END IF;
  
  -- Tentar inserir ou atualizar contato existente
  INSERT INTO public.contacts (name, email, phone, source, contact_count, last_contact_date, first_contact_date)
  VALUES (p_name, p_email, clean_phone, p_source, 1, now(), now())
  ON CONFLICT (phone) DO UPDATE SET
    name = CASE 
      WHEN contacts.name = '' OR contacts.name IS NULL THEN p_name
      ELSE contacts.name 
    END,
    email = CASE 
      WHEN contacts.email = '' OR contacts.email IS NULL THEN p_email
      ELSE contacts.email 
    END,
    contact_count = contacts.contact_count + 1,
    last_contact_date = now(),
    updated_at = now(),
    source = CASE 
      WHEN contacts.source = 'prospecção' THEN p_source
      ELSE contacts.source 
    END
  RETURNING * INTO result_contact;
  
  RETURN result_contact;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar ou criar contato
CREATE OR REPLACE FUNCTION public.get_or_create_contact(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT
) RETURNS public.contacts AS $$
DECLARE
  result_contact public.contacts;
  clean_phone TEXT;
BEGIN
  -- Limpar telefone
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Se o telefone não começar com 55, adicionar
  IF clean_phone !~ '^55' AND length(clean_phone) >= 10 THEN
    clean_phone := '55' || clean_phone;
  END IF;
  
  -- Buscar contato existente por telefone
  SELECT * INTO result_contact 
  FROM public.contacts 
  WHERE phone = clean_phone;
  
  -- Se não encontrou, criar novo
  IF result_contact IS NULL THEN
    INSERT INTO public.contacts (name, email, phone, source)
    VALUES (p_name, p_email, clean_phone, 'prospecção')
    RETURNING * INTO result_contact;
  END IF;
  
  RETURN result_contact;
END;
$$ LANGUAGE plpgsql; 