// Serviço SIMPLES para WhatsApp via Evolution API
class WhatsAppService {
  private config = {
    baseUrl: 'https://evo.conaesbrasil.com.br',
    apiKey: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
    instance: 'gustavo'
  };

  // ENVIAR MENSAGEM
  async sendMessage(phone: string, message: string): Promise<boolean> {
    console.log('📱 Enviando WhatsApp para:', phone);
    
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
        console.log('✅ Mensagem enviada!');
        return true;
      } else {
        console.error('❌ Erro:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar:', error);
      return false;
    }
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
      // Tentar enviar mensagem de teste
      const testResult = await this.sendMessage('5511999999999', 'teste');
      return testResult ? '✅ Instância OK' : '❌ Verificar WhatsApp';
    } catch (error) {
      return '❌ Instância com problema';
    }
  }
}

export const whatsappService = new WhatsAppService(); 