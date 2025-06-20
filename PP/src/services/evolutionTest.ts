import { evolutionService } from './evolutionService';
import { supabase } from '@/integrations/supabase/client';

class EvolutionTest {
  private hasBeenTested = false;

  async runInternalTest() {
    // Evitar múltiplos testes
    if (this.hasBeenTested) return;
    this.hasBeenTested = true;

    console.log('🧪 EVOLUTION API - Teste de Conectividade');

    try {
      // Teste direto da API base
      const response = await fetch('https://evo.conaesbrasil.com.br', {
        method: 'GET',
        headers: {
          'apikey': 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
        },
      });

      console.log('📡 API Status:', response.status);
      
      if (response.ok) {
        const data = await response.text();
        console.log('✅ API Online:', data);
        
        // Teste da instância
        await this.testInstance();
      } else {
        console.log('❌ API Offline:', response.status);
      }

    } catch (error) {
      console.error('❌ Erro de conexão:', error);
    }
  }

  private async testInstance() {
    console.log('🔌 Testando instância "gustavo"...');
    
    try {
      const result = await evolutionService.sendMessage({
        phone: '5511999999999',
        message: 'Teste de conectividade'
      });

      if (result) {
        console.log('✅ Instância funcionando!');
      }
    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log('⚠️ Instância "gustavo" não encontrada ou inativa');
        console.log('💡 Verifique se a instância está criada e ativa na Evolution');
      } else if (error.message.includes('400')) {
        console.log('⚠️ WhatsApp não conectado na instância');
        console.log('💡 Escaneie o QR Code para conectar o WhatsApp');
      } else {
        console.log('❌ Erro na instância:', error.message);
      }
    }
  }

  private async createTestConfig() {
    try {
      const { error } = await supabase
        .from('evolution_config')
        .insert({
          instance_name: 'gustavo',
          api_url: 'https://evo.conaesbrasil.com.br',
          api_key: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517',
          webhook_url: '',
          is_active: true
        });

      if (error) {
        console.error('❌ Erro ao criar configuração:', error);
      } else {
        console.log('✅ Configuração de teste criada');
      }
    } catch (error) {
      console.error('❌ Erro ao inserir configuração:', error);
    }
  }

  private async testAPIConnection(config: any) {
    console.log('🔌 Testando conexão com a API...');
    
    try {
      const response = await fetch(config.api_url, {
        method: 'GET',
        headers: {
          'apikey': config.api_key,
        },
      });

      console.log('📡 Status da API base:', response.status);
      
      const text = await response.text();
      console.log('📄 Resposta da API:', text);

      if (response.ok) {
        console.log('✅ Conexão com API funcionando');
      } else {
        console.log('⚠️ API respondeu com erro:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro de conexão com API:', error);
    }
  }

  private async testMessageSending() {
    console.log('📱 Testando envio de mensagem...');
    
    try {
      // Usar número fictício para teste
      const testResult = await evolutionService.sendMessage({
        phone: '5511999999999',
        message: 'Teste interno da Evolution API'
      });

      if (testResult) {
        console.log('✅ Teste de envio passou (API respondeu positivamente)');
      }
    } catch (error: any) {
      console.log('📊 Resultado do teste de envio:');
      console.log('   Erro:', error.message);
      
      // Analisar tipo de erro
      if (error.message.includes('404')) {
        console.log('   💡 Significa: Instância não encontrada ou inativa');
        console.log('   🔧 Solução: Verificar se instância "gustavo" existe e está ativa');
      } else if (error.message.includes('401')) {
        console.log('   💡 Significa: API Key inválida');
        console.log('   🔧 Solução: Verificar chave da API');
      } else if (error.message.includes('400')) {
        console.log('   💡 Significa: Número inválido ou WhatsApp não conectado');
        console.log('   🔧 Solução: Conectar WhatsApp na instância');
      } else {
        console.log('   💡 Erro inesperado:', error.message);
      }
    }
  }

  // Teste específico para número real
  async testRealNumber(phone: string, name: string) {
    console.log(`🎯 TESTE REAL - Enviando para: ${phone}`);
    
    const message = `Ola ${name}!

Obrigado por se cadastrar no Conaes!

Nossa equipe entrara em contato em breve.

Bem-vindo a familia Conaes!`;

    try {
      const result = await evolutionService.sendMessage({
        phone: phone,
        message: message
      });

      if (result) {
        console.log('✅ SUCESSO - Mensagem enviada para número real!');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('❌ FALHA no envio:', error.message);
      return false;
    }
  }
}

export const evolutionTest = new EvolutionTest(); 