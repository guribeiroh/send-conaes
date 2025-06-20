-- Migração: Sistema de Fila WhatsApp Anti-Bloqueio
-- Data: 2025-01-21
-- Descrição: Tabelas para gerenciar filas de mensagens, instâncias e campanhas

-- Tabela para gerenciar instâncias do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'maintenance')),
  daily_count INTEGER DEFAULT 0,
  hourly_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  rate_limits JSONB DEFAULT '{
    "perMinute": 8,
    "perHour": 300,
    "perDay": 3000
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela principal da fila de mensagens
CREATE TABLE IF NOT EXISTS message_queue (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id TEXT,
  contact_name TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  instance_id TEXT REFERENCES whatsapp_instances(id),
  campaign_id TEXT,
  metadata JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para histórico de mensagens enviadas
CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  instance_id TEXT REFERENCES whatsapp_instances(id),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  contact_name TEXT,
  campaign_id TEXT,
  template_id TEXT,
  delivery_status TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para campanhas em lote
CREATE TABLE IF NOT EXISTS bulk_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  batch_size INTEGER DEFAULT 50,
  delay_between_batches INTEGER DEFAULT 5, -- em minutos
  template_content TEXT NOT NULL,
  total_contacts INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para contatos da campanha
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message_id TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para estatísticas diárias
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  instance_id TEXT REFERENCES whatsapp_instances(id),
  messages_sent INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_queued INTEGER DEFAULT 0,
  avg_response_time DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, instance_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_priority ON message_queue(priority);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled_at ON message_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_campaign_id ON message_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_created_at ON message_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_sent_messages_phone ON sent_messages(phone);
CREATE INDEX IF NOT EXISTS idx_sent_messages_campaign_id ON sent_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_sent_at ON sent_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_instance_id ON daily_stats(instance_id);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_instances_updated_at 
  BEFORE UPDATE ON whatsapp_instances 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_queue_updated_at 
  BEFORE UPDATE ON message_queue 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_campaigns_updated_at 
  BEFORE UPDATE ON bulk_campaigns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar mensagens antigas (mais de 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    -- Limpar mensagens enviadas antigas
    DELETE FROM sent_messages 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Limpar mensagens falhadas antigas da fila
    DELETE FROM message_queue 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Limpar estatísticas antigas (manter apenas 90 dias)
    DELETE FROM daily_stats 
    WHERE date < CURRENT_DATE - INTERVAL '90 days';
    
    RAISE NOTICE 'Limpeza de mensagens antigas concluída';
END;
$$ LANGUAGE plpgsql;

-- Inserir instância padrão
INSERT INTO whatsapp_instances (
  id,
  name,
  base_url,
  api_key,
  instance_name,
  status,
  rate_limits
) VALUES (
  'primary',
  'Instância Principal - Gustavo',
  'https://evo.conaesbrasil.com.br',
  'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
  'gustavo',
  'active',
  '{
    "perMinute": 8,
    "perHour": 300,
    "perDay": 3000
  }'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  api_key = EXCLUDED.api_key,
  instance_name = EXCLUDED.instance_name,
  rate_limits = EXCLUDED.rate_limits,
  updated_at = NOW();

-- Política RLS (Row Level Security)
-- Habilitar RLS para todas as tabelas
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso a usuários autenticados
CREATE POLICY "Usuários autenticados podem ver instâncias" ON whatsapp_instances
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar fila" ON message_queue
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem ver mensagens enviadas" ON sent_messages
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar campanhas" ON bulk_campaigns
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar contatos de campanhas" ON campaign_contacts
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem ver estatísticas" ON daily_stats
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Comentários para documentação
COMMENT ON TABLE whatsapp_instances IS 'Instâncias do WhatsApp para distribuição de carga';
COMMENT ON TABLE message_queue IS 'Fila principal de mensagens com sistema anti-bloqueio';
COMMENT ON TABLE sent_messages IS 'Histórico de mensagens enviadas com sucesso';
COMMENT ON TABLE bulk_campaigns IS 'Campanhas em lote para prospecção em massa';
COMMENT ON TABLE campaign_contacts IS 'Contatos específicos de cada campanha';
COMMENT ON TABLE daily_stats IS 'Estatísticas diárias de uso das instâncias';

COMMENT ON COLUMN message_queue.priority IS 'Prioridade: urgent > high > normal > low';
COMMENT ON COLUMN message_queue.status IS 'Status: pending -> processing -> sent/failed';
COMMENT ON COLUMN whatsapp_instances.rate_limits IS 'Limites de envio por instância (JSON)';
COMMENT ON COLUMN bulk_campaigns.delay_between_batches IS 'Delay em minutos entre lotes';

-- Log da migração
INSERT INTO public.migrations_log (
  migration_name,
  executed_at,
  description
) VALUES (
  '20250621140000-whatsapp-queue-system',
  NOW(),
  'Sistema de fila WhatsApp anti-bloqueio: instâncias, filas, campanhas e estatísticas'
) ON CONFLICT (migration_name) DO NOTHING; 