import { supabase } from '@/integrations/supabase/client';

// Tipos para o sistema de fila
interface QueueMessage {
  id: string;
  phone: string;
  message: string;
  template_id?: string;
  contact_name?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_at?: Date;
  created_at: Date;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  instance_id?: string;
  campaign_id?: string;
  metadata?: Record<string, any>;
}

interface WhatsAppInstance {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  status: 'active' | 'inactive' | 'blocked' | 'maintenance';
  lastUsed: Date;
  dailyCount: number;
  hourlyCount: number;
  rateLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  blocked: number;
}

class WhatsAppQueueService {
  private instances: WhatsAppInstance[] = [
    {
      id: 'primary',
      name: 'Instância Principal - Gustavo',
      baseUrl: 'https://evo.conaesbrasil.com.br',
      apiKey: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
      instanceName: 'gustavo',
      status: 'active',
      lastUsed: new Date(),
      dailyCount: 0,
      hourlyCount: 0,
      rateLimits: {
        perMinute: 8,  // Conservador para evitar bloqueio
        perHour: 300,  // 5 mensagens por minuto em média
        perDay: 3000   // Limite diário seguro
      }
    }
    // Aqui você pode adicionar mais instâncias
    // {
    //   id: 'secondary',
    //   name: 'Instância Secundária',
    //   baseUrl: 'https://evo2.conaesbrasil.com.br',
    //   apiKey: 'OUTRA-API-KEY',
    //   instanceName: 'gustavo2',
    //   status: 'active',
    //   lastUsed: new Date(),
    //   dailyCount: 0,
    //   hourlyCount: 0,
    //   rateLimits: {
    //     perMinute: 8,
    //     perHour: 300,
    //     perDay: 3000
    //   }
    // }
  ];

  private processing = false;
  private pauseUntil?: Date;

  constructor() {
    this.startQueueProcessor();
    this.startStatsReset();
  }

  // Adicionar mensagem à fila
  async addToQueue(
    phone: string,
    message: string,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      scheduledAt?: Date;
      templateId?: string;
      contactName?: string;
      campaignId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueMessage: QueueMessage = {
      id: messageId,
      phone: this.formatPhone(phone),
      message,
      template_id: options.templateId,
      contact_name: options.contactName,
      priority: options.priority || 'normal',
      scheduled_at: options.scheduledAt,
      created_at: new Date(),
      attempts: 0,
      max_attempts: 3,
      status: 'pending',
      campaign_id: options.campaignId,
      metadata: options.metadata
    };

    // Salvar na fila (localStorage temporário)
    const queue = this.getQueue();
    queue.push(queueMessage);
    this.saveQueue(queue);

    console.log(`📥 Mensagem adicionada à fila: ${messageId} (${options.priority})`);
    
    return messageId;
  }

  // Envio imediato para casos urgentes
  async sendImmediate(
    phone: string,
    message: string,
    options: { contactName?: string; campaignId?: string } = {}
  ): Promise<boolean> {
    const instance = this.getBestInstance();
    if (!instance) {
      console.error('❌ Nenhuma instância disponível para envio imediato');
      return false;
    }

    return await this.sendMessage(instance, {
      id: `immediate_${Date.now()}`,
      phone: this.formatPhone(phone),
      message,
      contact_name: options.contactName,
      priority: 'urgent',
      created_at: new Date(),
      attempts: 0,
      max_attempts: 1,
      status: 'processing',
      campaign_id: options.campaignId
    });
  }

  // Processar fila automaticamente
  private async startQueueProcessor() {
    setInterval(async () => {
      if (this.processing || this.isPaused()) return;
      
      await this.processQueue();
    }, 8000); // Processar a cada 8 segundos (seguro)
  }

  private async processQueue() {
    if (this.processing) return;
    
    this.processing = true;

    try {
      const queue = this.getQueue();
      const pendingMessages = queue
        .filter(msg => 
          msg.status === 'pending' && 
          (!msg.scheduled_at || new Date(msg.scheduled_at) <= new Date())
        )
        .sort(this.prioritizeMessages);

      if (pendingMessages.length === 0) {
        return;
      }

      // Pegar próxima mensagem
      const nextMessage = pendingMessages[0];
      const instance = this.getBestInstance();

      if (!instance) {
        this.pauseQueue(5 * 60 * 1000); // Pausar por 5 minutos
        return;
      }

      // Verificar rate limits
      if (!this.canSendMessage(instance)) {
        this.pauseQueue(60 * 1000); // Pausar por 1 minuto
        return;
      }

      console.log(`📤 Enviando mensagem ${nextMessage.id} via ${instance.name}`);
      
      // Marcar como processando
      nextMessage.status = 'processing';
      nextMessage.instance_id = instance.id;
      this.updateQueueMessage(nextMessage);

      // Tentar enviar
      const success = await this.sendMessage(instance, nextMessage);
      
      if (success) {
        nextMessage.status = 'sent';
        instance.dailyCount++;
        instance.hourlyCount++;
        instance.lastUsed = new Date();
        
        console.log(`✅ Mensagem ${nextMessage.id} enviada com sucesso`);
        
        // Remover da fila local
        this.removeFromQueue(nextMessage.id);
        
        // Pequena pausa entre mensagens para parecer mais humano
        await this.sleep(this.getRandomDelay());
      } else {
        nextMessage.attempts++;
        
        if (nextMessage.attempts >= nextMessage.max_attempts) {
          nextMessage.status = 'failed';
          console.log(`❌ Mensagem ${nextMessage.id} falhada após ${nextMessage.attempts} tentativas`);
        } else {
          nextMessage.status = 'pending';
          console.log(`🔄 Mensagem ${nextMessage.id} será reprocessada (tentativa ${nextMessage.attempts})`);
        }
        
        this.updateQueueMessage(nextMessage);
      }

    } catch (error) {
      console.error('❌ Erro no processamento da fila:', error);
    } finally {
      this.processing = false;
    }
  }

  // Enviar mensagem individual
  private async sendMessage(instance: WhatsAppInstance, message: QueueMessage): Promise<boolean> {
    const url = `${instance.baseUrl}/message/sendText/${instance.instanceName}`;
    const payload = {
      number: message.phone,
      text: message.message
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      } else {
        const result = await response.text();
        
        // Analisar tipo de erro para possível bloqueio
        if (response.status === 429 || result.includes('rate limit')) {
          console.warn(`⚠️ Rate limit detectado em ${instance.name}`);
          this.pauseQueue(10 * 60 * 1000); // Pausar por 10 minutos
        } else if (response.status === 403 || result.includes('blocked')) {
          console.error(`🚫 Instância ${instance.name} pode estar bloqueada`);
          instance.status = 'blocked';
          this.pauseQueue(30 * 60 * 1000); // Pausar por 30 minutos
        }

        return false;
      }
    } catch (error) {
      console.error(`❌ Erro na requisição para ${instance.name}:`, error);
      return false;
    }
  }

  // Utilitários de fila
  private getQueue(): QueueMessage[] {
    const queue = localStorage.getItem('whatsapp_queue');
    return queue ? JSON.parse(queue) : [];
  }

  private saveQueue(queue: QueueMessage[]) {
    localStorage.setItem('whatsapp_queue', JSON.stringify(queue));
  }

  private updateQueueMessage(message: QueueMessage) {
    const queue = this.getQueue();
    const index = queue.findIndex(m => m.id === message.id);
    if (index !== -1) {
      queue[index] = message;
      this.saveQueue(queue);
    }
  }

  private removeFromQueue(messageId: string) {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(m => m.id !== messageId);
    this.saveQueue(filteredQueue);
  }

  // Seleção de instância inteligente
  private getBestInstance(): WhatsAppInstance | null {
    const activeInstances = this.instances.filter(i => i.status === 'active');
    
    if (activeInstances.length === 0) return null;

    // Encontrar instância com menor uso e disponível
    return activeInstances
      .filter(i => this.canSendMessage(i))
      .sort((a, b) => {
        if (a.dailyCount !== b.dailyCount) {
          return a.dailyCount - b.dailyCount;
        }
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      })[0] || null;
  }

  // Verificação de rate limits
  private canSendMessage(instance: WhatsAppInstance): boolean {
    const now = new Date();
    
    // Verificar se passou tempo suficiente desde último envio (mínimo 8 segundos)
    const timeSinceLastUse = now.getTime() - instance.lastUsed.getTime();
    if (timeSinceLastUse < 8000) return false;

    // Verificar limites diários e horários
    if (instance.dailyCount >= instance.rateLimits.perDay) return false;
    if (instance.hourlyCount >= instance.rateLimits.perHour) return false;

    return true;
  }

  // Priorização de mensagens
  private prioritizeMessages(a: QueueMessage, b: QueueMessage): number {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    
    // Primeiro por prioridade
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Depois por tentativas (menos tentativas primeiro)
    const attemptsDiff = a.attempts - b.attempts;
    if (attemptsDiff !== 0) return attemptsDiff;
    
    // Por último, por idade (mais antigas primeiro)
    return a.created_at.getTime() - b.created_at.getTime();
  }

  // Utilitários
  private formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    return clean.startsWith('55') ? clean : `55${clean}`;
  }

  private isPaused(): boolean {
    return this.pauseUntil ? new Date() < this.pauseUntil : false;
  }

  private pauseQueue(milliseconds: number) {
    this.pauseUntil = new Date(Date.now() + milliseconds);
    console.log(`⏸️ Fila pausada até ${this.pauseUntil.toLocaleTimeString()}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRandomDelay(): number {
    // Delay entre 3-12 segundos para parecer mais humano
    return 3000 + Math.random() * 9000;
  }

  // Reset de contadores
  private startStatsReset() {
    // Reset contadores horários a cada hora
    setInterval(() => {
      this.instances.forEach(instance => {
        instance.hourlyCount = 0;
      });
    }, 60 * 60 * 1000);

    // Reset contadores diários à meia-noite
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.instances.forEach(instance => {
          instance.dailyCount = 0;
        });
      }
    }, 60 * 1000);
  }

  // APIs públicas para gerenciamento
  async getQueueStats(): Promise<QueueStats> {
    const queue = this.getQueue();
    
    return {
      total: queue.length,
      pending: queue.filter(m => m.status === 'pending').length,
      processing: queue.filter(m => m.status === 'processing').length,
      sent: queue.filter(m => m.status === 'sent').length,
      failed: queue.filter(m => m.status === 'failed').length,
      blocked: this.instances.filter(i => i.status === 'blocked').length
    };
  }

  async pauseQueueManually(minutes: number = 30) {
    this.pauseQueue(minutes * 60 * 1000);
  }

  async resumeQueue() {
    this.pauseUntil = undefined;
    console.log('▶️ Fila retomada manualmente');
  }

  async clearFailedMessages() {
    const queue = this.getQueue();
    const activeQueue = queue.filter(m => m.status !== 'failed');
    this.saveQueue(activeQueue);
    console.log('🗑️ Mensagens falhadas removidas da fila');
  }

  async getInstancesStatus() {
    return this.instances.map(instance => ({
      id: instance.id,
      name: instance.name,
      status: instance.status,
      dailyCount: instance.dailyCount,
      hourlyCount: instance.hourlyCount,
      lastUsed: instance.lastUsed,
      rateLimits: instance.rateLimits,
      canSend: this.canSendMessage(instance)
    }));
  }

  // Reativar instância bloqueada
  async reactivateInstance(instanceId: string) {
    const instance = this.instances.find(i => i.id === instanceId);
    if (instance) {
      instance.status = 'active';
      instance.dailyCount = 0;
      instance.hourlyCount = 0;
      console.log(`✅ Instância ${instance.name} reativada`);
    }
  }
}

export const whatsappQueueService = new WhatsAppQueueService(); 