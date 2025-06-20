import { supabase } from '@/integrations/supabase/client';
import type { SendMessageRequest, EvolutionConfig } from '@/types/chat';

class EvolutionService {
  private config: EvolutionConfig | null = null;

  async getConfig(): Promise<EvolutionConfig | null> {
    if (this.config) return this.config;

    const { data, error } = await supabase
      .from('evolution_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Erro ao buscar configuração da Evolution:', error);
      return null;
    }

    this.config = data;
    return data;
  }

  async sendMessage(request: SendMessageRequest): Promise<boolean> {
    console.log('🚀 EVOLUTION API - Iniciando envio:', request);
    
    // Configuração fixa (sem banco de dados para evitar problemas)
    const config = {
      api_url: 'https://evo.conaesbrasil.com.br',
      api_key: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
      instance_name: 'gustavo'
    };

    console.log('✅ Usando configuração fixa:', config);

    // Limpar número (só dígitos + código país)
    const cleanPhone = request.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    console.log('📱 Número formatado:', formattedPhone);

    const url = `${config.api_url}/message/sendText/${config.instance_name}`;
    const payload = {
      number: formattedPhone,
      text: request.message,
    };

    console.log('📡 URL:', url);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Status:', response.status);
      
      const responseText = await response.text();
      console.log('📥 Response:', responseText);

      if (!response.ok) {
        // Analisar erro específico
        if (response.status === 404) {
          throw new Error(`❌ INSTÂNCIA NÃO ENCONTRADA\n\nA instância '${config.instance_name}' não existe ou está inativa.\n\n🔧 SOLUÇÃO:\n1. Acesse: http://evo.conaesbrasil.com.br/manager\n2. Crie/ative a instância 'gustavo'\n3. Tente novamente`);
        } else if (response.status === 401) {
          throw new Error('❌ API KEY INVÁLIDA\n\nA chave da API está incorreta ou expirada.\n\n🔧 SOLUÇÃO: Verifique a API Key da Evolution');
        } else if (response.status === 400) {
          // Verificar se é problema de WhatsApp não conectado
          if (responseText.includes('exists":false') || responseText.includes('Bad Request')) {
            throw new Error(`❌ WHATSAPP NÃO CONECTADO\n\nA instância 'gustavo' existe mas o WhatsApp não está conectado.\n\n🔧 SOLUÇÃO:\n1. Acesse: http://evo.conaesbrasil.com.br/manager\n2. Escaneie o QR Code da instância 'gustavo'\n3. Aguarde conectar e tente novamente`);
          } else {
            throw new Error(`❌ NÚMERO INVÁLIDO\n\nO número ${formattedPhone} não é válido.\n\n🔧 SOLUÇÃO: Verifique o formato do número`);
          }
        } else {
          throw new Error(`❌ ERRO DA EVOLUTION API\n\nStatus: ${response.status}\nResposta: ${responseText}`);
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Resposta da Evolution:', result);
      } catch (parseError) {
        console.error('❌ Erro no parse JSON:', parseError);
        // Se não conseguir fazer parse mas status é 200, considerar sucesso
        if (response.status === 200) {
          console.log('✅ Mensagem enviada (resposta não-JSON)');
          return true;
        }
        throw new Error(`Resposta inválida: ${responseText}`);
      }

      // Verificar se há erro na resposta JSON
      if (result.error) {
        throw new Error(`Evolution API: ${result.error}`);
      }

      console.log('✅ SUCESSO - Mensagem enviada via Evolution API!');
      
      // Tentar salvar no banco (não crítico)
      try {
        await this.saveOutgoingMessage(formattedPhone, request.message, result.key?.id);
      } catch (saveError) {
        console.warn('⚠️ Erro ao salvar no banco (mensagem foi enviada):', saveError);
      }

      return true;
    } catch (error: any) {
      console.error('❌ ERRO EVOLUTION API:', error.message);
      throw error;
    }
  }

  async saveOutgoingMessage(phone: string, message: string, messageId?: string) {
    // Primeiro, garantir que o contato existe
    const contact = await this.ensureContact(phone);

    // Salvar a mensagem
    const { error } = await supabase.from('chat_messages').insert({
      contact_id: contact.id,
      message_id: messageId,
      content: message,
      message_type: 'text',
      direction: 'outgoing',
      status: 'sent',
    });

    if (error) {
      console.error('Erro ao salvar mensagem enviada:', error);
    }
  }

  async saveIncomingMessage(webhookData: any) {
    try {
      const phone = webhookData.data.key.remoteJid.replace('@s.whatsapp.net', '');
      const message = webhookData.data.message.conversation || 
                     webhookData.data.message.imageMessage?.caption || 
                     'Mídia recebida';
      
      const messageType = this.getMessageType(webhookData.data.message);
      const contact = await this.ensureContact(phone, webhookData.data.pushName);

      const { error } = await supabase.from('chat_messages').insert({
        contact_id: contact.id,
        message_id: webhookData.data.key.id,
        content: message,
        message_type: messageType,
        direction: 'incoming',
        status: 'delivered',
        timestamp: new Date(webhookData.data.messageTimestamp * 1000).toISOString(),
      });

      if (error) {
        console.error('Erro ao salvar mensagem recebida:', error);
      }

      return true;
    } catch (error) {
      console.error('Erro ao processar mensagem recebida:', error);
      return false;
    }
  }

  private async ensureContact(phone: string, name?: string) {
    // Verificar se contato já existe
    let { data: contact, error } = await supabase
      .from('chat_contacts')
      .select('*')
      .eq('phone_number', phone)
      .single();

    if (error && error.code === 'PGRST116') {
      // Contato não existe, criar novo
      const { data: newContact, error: insertError } = await supabase
        .from('chat_contacts')
        .insert({
          phone_number: phone,
          name: name || phone,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Erro ao criar contato: ${insertError.message}`);
      }

      contact = newContact;
    } else if (error) {
      throw new Error(`Erro ao buscar contato: ${error.message}`);
    }

    // Atualizar nome se fornecido e diferente
    if (name && contact.name !== name) {
      await supabase
        .from('chat_contacts')
        .update({ name })
        .eq('id', contact.id);
      
      contact.name = name;
    }

    return contact;
  }

  private getMessageType(message: any): 'text' | 'image' | 'audio' | 'video' | 'document' {
    if (message.conversation) return 'text';
    if (message.imageMessage) return 'image';
    if (message.audioMessage) return 'audio';
    if (message.videoMessage) return 'video';
    if (message.documentMessage) return 'document';
    return 'text';
  }

  async markAsRead(contactId: string) {
    const { error } = await supabase
      .from('chat_contacts')
      .update({ unread_count: 0 })
      .eq('id', contactId);

    if (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  }

  // Função para configurar webhook (chamada manualmente quando necessário)
  async setupWebhook(webhookUrl: string) {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('Configuração da Evolution API não encontrada');
    }

    try {
      const response = await fetch(`${config.api_url}/webhook/set/${config.instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE'
            ],
          },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      return false;
    }
  }
}

export const evolutionService = new EvolutionService(); 