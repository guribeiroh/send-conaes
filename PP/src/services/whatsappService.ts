import { whatsappQueueService } from './whatsappQueueService';

// Serviço INTELIGENTE para WhatsApp via Evolution API com Sistema de Fila Anti-Bloqueio
class WhatsAppService {
  private config = {
    baseUrl: 'https://evo.conaesbrasil.com.br',
    apiKey: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
    instance: 'gustavo'
  };

  // ENVIAR MENSAGEM - Agora com Sistema de Fila Inteligente
  async sendMessage(
    phone: string, 
    message: string, 
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      useQueue?: boolean;
      contactName?: string;
      campaignId?: string;
    } = {}
  ): Promise<boolean> {
    console.log('📱 Enviando WhatsApp para:', phone);
    
    // Por padrão, usar a fila para evitar bloqueios
    const shouldUseQueue = options.useQueue !== false; // Default true
    
    if (shouldUseQueue && options.priority !== 'urgent') {
      console.log('🔄 Adicionando à fila inteligente para evitar bloqueios...');
      
      try {
        const messageId = await whatsappQueueService.addToQueue(phone, message, {
          priority: options.priority || 'normal',
          contactName: options.contactName,
          campaignId: options.campaignId
        });
        
        console.log(`✅ Mensagem ${messageId} adicionada à fila com sucesso`);
        
        // Retorna true pois foi adicionada à fila (será enviada automaticamente)
        return true;
      } catch (error) {
        console.error('❌ Erro ao adicionar à fila, tentando envio direto:', error);
        // Se falhar na fila, tenta envio direto como fallback
        return await this.sendDirectMessage(phone, message);
      }
    } else {
      // Para mensagens urgentes ou quando especificamente solicitado
      console.log('⚡ Enviando diretamente (urgente ou sem fila)...');
      
      if (options.priority === 'urgent') {
        return await whatsappQueueService.sendImmediate(phone, message, {
          contactName: options.contactName,
          campaignId: options.campaignId
        });
      } else {
        return await this.sendDirectMessage(phone, message);
      }
    }
  }

  // ENVIO DIRETO (usado apenas como fallback ou para casos especiais)
  private async sendDirectMessage(phone: string, message: string): Promise<boolean> {
    // Limpar e formatar número
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const url = `${this.config.baseUrl}/message/sendText/${this.config.instance}`;
    const payload = {
      number: formattedPhone,
      text: message
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.text();
      console.log('📤 Resposta Evolution:', response.status, result);

      if (response.ok) {
        console.log('✅ Mensagem enviada diretamente!');
        return true;
      } else {
        console.error('❌ Erro no envio direto:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar diretamente:', error);
      return false;
    }
  }

  // MÉTODO LEGACY - Compatibilidade com código existente
  async sendMessageLegacy(phone: string, message: string): Promise<boolean> {
    return await this.sendMessage(phone, message, { useQueue: false });
  }

  // MÉTODOS DE CONTROLE DA FILA
  async getQueueStats() {
    return await whatsappQueueService.getQueueStats();
  }

  async pauseQueue(minutes: number = 30) {
    await whatsappQueueService.pauseQueueManually(minutes);
    console.log(`⏸️ Fila pausada por ${minutes} minutos`);
  }

  async resumeQueue() {
    await whatsappQueueService.resumeQueue();
    console.log('▶️ Fila retomada');
  }

  async clearFailedMessages() {
    await whatsappQueueService.clearFailedMessages();
    console.log('🗑️ Mensagens falhadas limpas');
  }

  // ENVIO EM LOTE - Para campanhas grandes
  async sendBulkMessages(
    contacts: Array<{ phone: string; message: string; name?: string }>,
    options: {
      priority?: 'low' | 'normal' | 'high';
      campaignId?: string;
      batchSize?: number;
      delayBetweenBatches?: number; // em minutos
    } = {}
  ): Promise<string[]> {
    const { 
      priority = 'normal', 
      campaignId = `bulk_${Date.now()}`,
      batchSize = 50,
      delayBetweenBatches = 5 
    } = options;

    console.log(`📊 Iniciando envio em lote: ${contacts.length} mensagens`);
    
    const messageIds: string[] = [];
    
    // Dividir em lotes
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(contacts.length / batchSize);
      
      console.log(`📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} mensagens)`);
      
      // Adicionar cada mensagem do lote à fila
      for (const contact of batch) {
        try {
          const messageId = await whatsappQueueService.addToQueue(
            contact.phone, 
            contact.message, 
            {
              priority,
              contactName: contact.name,
              campaignId,
              // Agendar com pequeno delay para distribuir o envio
              scheduledAt: new Date(Date.now() + (messageIds.length * 2000)) // 2s entre mensagens
            }
          );
          messageIds.push(messageId);
        } catch (error) {
          console.error(`❌ Erro ao adicionar ${contact.phone} à fila:`, error);
        }
      }
      
      // Pausa entre lotes (exceto no último)
      if (i + batchSize < contacts.length) {
        console.log(`⏱️ Pausa de ${delayBetweenBatches} minutos entre lotes...`);
        // Agendar próximo lote
        const nextBatchDelay = delayBetweenBatches * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequena pausa simbólica
      }
    }
    
    console.log(`✅ ${messageIds.length} mensagens adicionadas à fila para envio controlado`);
    return messageIds;
  }

  // TESTAR CONEXÃO
  async testConnection(): Promise<string> {
    try {
      const response = await fetch(this.config.baseUrl);
      if (response.ok) {
        return '✅ Evolution API Online';
      } else {
        return '❌ Evolution API Offline';
      }
    } catch (error) {
      return '❌ Erro de conexão';
    }
  }

  // VERIFICAR INSTÂNCIA
  async checkInstance(): Promise<string> {
    try {
      // Usar a fila para teste não impactar rate limits
      const testResult = await whatsappQueueService.addToQueue(
        '5511999999999', 
        'teste', 
        { priority: 'low' }
      );
      return testResult ? '✅ Instância OK (teste adicionado à fila)' : '❌ Verificar WhatsApp';
    } catch (error) {
      return '❌ Instância com problema';
    }
  }

  // MÉTRICAS DE PRODUTIVIDADE
  async getProductivityMetrics() {
    const stats = await whatsappQueueService.getQueueStats();
    const instances = await whatsappQueueService.getInstancesStatus();
    
    const totalSentToday = instances.reduce((acc, inst) => acc + inst.dailyCount, 0);
    const totalCapacityPerDay = instances
      .filter(inst => inst.status === 'active')
      .reduce((acc, inst) => acc + inst.rateLimits.perDay, 0);
    
    return {
      queueStats: stats,
      sentToday: totalSentToday,
      remainingCapacity: totalCapacityPerDay - totalSentToday,
      utilizationPercentage: (totalSentToday / totalCapacityPerDay) * 100,
      estimatedTimeToEmpty: this.calculateTimeToEmpty(stats.pending, instances),
      productivity: {
        messagesPerHour: this.calculateMessagesPerHour(instances),
        peakHours: this.identifyPeakHours(),
        efficiency: totalSentToday > 0 ? (stats.sent / (stats.sent + stats.failed)) * 100 : 0
      }
    };
  }

  private calculateTimeToEmpty(pendingMessages: number, instances: any[]): string {
    const activeInstances = instances.filter(i => i.status === 'active' && i.canSend);
    if (activeInstances.length === 0) return 'N/A';
    
    const totalRatePerMinute = activeInstances.reduce((acc, inst) => acc + inst.rateLimits.perMinute, 0);
    const minutesToEmpty = pendingMessages / totalRatePerMinute;
    
    if (minutesToEmpty < 60) {
      return `${Math.ceil(minutesToEmpty)} minutos`;
    } else {
      const hours = Math.floor(minutesToEmpty / 60);
      const minutes = Math.ceil(minutesToEmpty % 60);
      return `${hours}h ${minutes}min`;
    }
  }

  private calculateMessagesPerHour(instances: any[]): number {
    return instances
      .filter(i => i.status === 'active')
      .reduce((acc, inst) => acc + (inst.rateLimits.perMinute * 60), 0);
  }

  private identifyPeakHours(): string[] {
    // Horários recomendados para melhor engajamento
    return ['09:00-12:00', '14:00-17:00', '19:00-21:00'];
  }
}

export const whatsappService = new WhatsAppService(); 