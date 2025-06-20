import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Save, TestTube, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { evolutionService } from '@/services/evolutionService';

interface EvolutionConfig {
  instance_name: string;
  webhook_url: string;
}

// Configurações fixas da API Evolution
const EVOLUTION_API_CONFIG = {
  api_url: 'https://evo.conaesbrasil.com.br', // URL da Evolution API
  api_key: 'D4EE9F2740E3-4E8C-9B0F-70B0AE9EC517', // Chave da Evolution API
};

const EvolutionConfigModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<EvolutionConfig>({
    instance_name: 'gustavo',
    webhook_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    if (!config.instance_name) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    if (!EVOLUTION_API_CONFIG.api_url || !EVOLUTION_API_CONFIG.api_key) {
      toast.error('Configurações da API não definidas no código');
      return;
    }

    setIsLoading(true);
    
    try {
      // Primeiro desativar configurações existentes
      await supabase
        .from('evolution_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // Inserir nova configuração
      const { error } = await supabase
        .from('evolution_config')
        .insert({
          instance_name: config.instance_name,
          api_url: EVOLUTION_API_CONFIG.api_url,
          api_key: EVOLUTION_API_CONFIG.api_key,
          webhook_url: config.webhook_url,
          is_active: true
        });

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
      setIsOpen(false);
      
      // Limpar formulário
      setConfig({
        instance_name: '',
        webhook_url: ''
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!EVOLUTION_API_CONFIG.api_url || !EVOLUTION_API_CONFIG.api_key) {
      toast.error('Configure primeiro a API no código');
      return;
    }

    if (!config.instance_name) {
      toast.error('Nome da instância é obrigatório para o teste');
      return;
    }

    setIsTesting(true);
    
    try {
      // Salvar configuração temporariamente para teste
      await supabase
        .from('evolution_config')
        .update({ is_active: false })
        .eq('is_active', true);

      await supabase
        .from('evolution_config')
        .insert({
          instance_name: config.instance_name,
          api_url: EVOLUTION_API_CONFIG.api_url,
          api_key: EVOLUTION_API_CONFIG.api_key,
          webhook_url: config.webhook_url,
          is_active: true
        });

      // Teste com um número fictício (Evolution deve retornar erro mas mostrar se a API responde)
      const testResult = await evolutionService.sendMessage({
        phone: '5511999999999',
        message: 'Teste de conexão - Evolution API'
      });

      if (testResult) {
        toast.success('✅ Conexão com Evolution API funcionando!');
      }
    } catch (error: any) {
      console.error('Erro no teste:', error);
      // Se o erro contém informações da API, significa que a conexão funciona
      if (error.message.includes('404') || error.message.includes('400')) {
        toast.success('✅ API Evolution respondeu! Configuração parece correta.');
        toast.warning('Para testar envio real, configure primeiro a instância no WhatsApp.');
      } else {
        toast.error(`❌ Erro de conexão: ${error.message}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600">
          <Settings className="w-4 h-4 mr-2" />
          Config Evolution
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-green-400">
            Configuração Evolution API
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações sobre configuração */}
          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
            <p className="text-xs text-gray-300 mb-2">
              ℹ️ As configurações da API Evolution já estão definidas no sistema.
            </p>
            <p className="text-xs text-gray-400">
              Você só precisa definir o nome da instância e opcionalmente o webhook.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance_name" className="text-green-400">Nome da Instância*</Label>
            <Input
              id="instance_name"
              value={config.instance_name}
              onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
              placeholder="ex: conaes-whatsapp"
              className="bg-gray-700 border-gray-600 text-gray-200"
            />
            <p className="text-xs text-gray-400">
              Nome único para identificar sua instância do WhatsApp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_url" className="text-green-400">URL do Webhook (opcional)</Label>
            <Input
              id="webhook_url"
              value={config.webhook_url}
              onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="ex: https://seudominio.com/webhook/evolution"
              className="bg-gray-700 border-gray-600 text-gray-200"
            />
            <p className="text-xs text-gray-400">
              URL para receber notificações de mensagens (deixe vazio se não usar)
            </p>
          </div>

          {/* Status da API */}
          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Status da API:</span>
              <span className={`text-xs font-medium ${
                EVOLUTION_API_CONFIG.api_url && EVOLUTION_API_CONFIG.api_key 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {EVOLUTION_API_CONFIG.api_url && EVOLUTION_API_CONFIG.api_key 
                  ? '✅ Configurada' 
                  : '❌ Não configurada'
                }
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isTesting || isLoading}
              variant="outline"
              className="flex-1 border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Testar
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isLoading || isTesting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvolutionConfigModal; 