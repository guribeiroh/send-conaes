import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Send, 
  FileText, 
  Users, 
  Clock, 
  Settings,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { whatsappService } from '@/services/whatsappService';
import { toast } from 'sonner';

interface Contact {
  phone: string;
  name?: string;
  message?: string;
}

interface CampaignConfig {
  name: string;
  priority: 'low' | 'normal' | 'high';
  batchSize: number;
  delayBetweenBatches: number;
  template: string;
}

const BulkCampaignManager: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '',
    priority: 'normal',
    batchSize: 50,
    delayBetweenBatches: 5,
    template: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvInput, setCsvInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [campaignResults, setCampaignResults] = useState<string[]>([]);

  // Template padrão para campanhas
  const defaultTemplate = `Olá {nome}! 👋

Espero que esteja bem! 

🎯 Tenho uma oportunidade especial para você:

✅ Soluções personalizadas para seu negócio
✅ Suporte especializado
✅ Resultados comprovados

Gostaria de saber mais? Responda esta mensagem!

Atenciosamente,
Equipe Conaes 🚀`;

  // Processar CSV de contatos
  const handleCsvUpload = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const phoneIndex = headers.findIndex(h => 
        h.includes('telefone') || h.includes('phone') || h.includes('celular') || h.includes('whatsapp')
      );
      const nameIndex = headers.findIndex(h => 
        h.includes('nome') || h.includes('name') || h.includes('cliente')
      );
      
      if (phoneIndex === -1) {
        throw new Error('Coluna de telefone não encontrada. Use "telefone", "phone", "celular" ou "whatsapp"');
      }
      
      const processedContacts: Contact[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim());
        
        if (columns[phoneIndex]) {
          const contact: Contact = {
            phone: columns[phoneIndex].replace(/\D/g, ''),
            name: nameIndex !== -1 ? columns[nameIndex] : undefined
          };
          
          if (contact.phone.length >= 10) {
            processedContacts.push(contact);
          }
        }
      }
      
      setContacts(processedContacts);
      setCsvInput('');
      toast.success(`${processedContacts.length} contatos carregados com sucesso!`);
      
    } catch (error: any) {
      toast.error('Erro ao processar CSV: ' + error.message);
    }
  };

  // Preparar mensagens personalizadas
  const prepareMessages = (): Array<{ phone: string; message: string; name?: string }> => {
    return contacts.map(contact => ({
      phone: contact.phone,
      name: contact.name,
      message: config.template.replace(/{nome}/g, contact.name || 'Cliente')
    }));
  };

  // Executar campanha
  const executeCampaign = async () => {
    if (contacts.length === 0) {
      toast.error('Adicione contatos antes de executar a campanha');
      return;
    }
    
    if (!config.template.trim()) {
      toast.error('Configure o template da mensagem');
      return;
    }
    
    if (!config.name.trim()) {
      toast.error('Dê um nome para a campanha');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const messages = prepareMessages();
      
      console.log(`🚀 Iniciando campanha "${config.name}" com ${messages.length} mensagens`);
      
      // Usar o sistema de fila do WhatsApp
      const messageIds = await whatsappService.sendBulkMessages(messages, {
        priority: config.priority,
        campaignId: `campaign_${Date.now()}_${config.name.replace(/\s+/g, '_')}`,
        batchSize: config.batchSize,
        delayBetweenBatches: config.delayBetweenBatches
      });
      
      setCampaignResults(messageIds);
      setProgress(100);
      
      toast.success(`🎉 Campanha "${config.name}" criada! ${messageIds.length} mensagens na fila`, {
        description: 'As mensagens serão enviadas automaticamente pelo sistema de fila',
        duration: 8000
      });
      
      // Limpar após sucesso
      setContacts([]);
      setConfig(prev => ({ ...prev, name: '', template: defaultTemplate }));
      
    } catch (error: any) {
      console.error('Erro na campanha:', error);
      toast.error('Erro ao executar campanha: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular estimativas
  const calculateEstimates = () => {
    const totalMessages = contacts.length;
    const totalBatches = Math.ceil(totalMessages / config.batchSize);
    const estimatedDuration = (totalBatches - 1) * config.delayBetweenBatches; // em minutos
    
    return {
      totalMessages,
      totalBatches,
      estimatedDuration: estimatedDuration > 60 
        ? `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}min`
        : `${estimatedDuration}min`
    };
  };

  const estimates = calculateEstimates();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">
            Gerenciador de Campanhas em Lote
          </h2>
          <p className="text-gray-400">
            Sistema inteligente com fila anti-bloqueio para alta produtividade
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração da Campanha */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="w-5 h-5 text-orange-400" />
              Configuração da Campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome da Campanha */}
            <div>
              <Label className="text-gray-300">Nome da Campanha</Label>
              <Input
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Prospecção Janeiro 2025"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Configurações Avançadas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Prioridade</Label>
                <Select 
                  value={config.priority} 
                  onValueChange={(value: any) => setConfig(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Tamanho do Lote</Label>
                <Input
                  type="number"
                  value={config.batchSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 50 }))}
                  min="10"
                  max="100"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Delay entre Lotes (minutos)</Label>
              <Input
                type="number"
                value={config.delayBetweenBatches}
                onChange={(e) => setConfig(prev => ({ ...prev, delayBetweenBatches: parseInt(e.target.value) || 5 }))}
                min="1"
                max="60"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Template da Mensagem */}
            <div>
              <Label className="text-gray-300">Template da Mensagem</Label>
              <Textarea
                value={config.template}
                onChange={(e) => setConfig(prev => ({ ...prev, template: e.target.value }))}
                placeholder={defaultTemplate}
                rows={8}
                className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Use {'{nome}'} para personalizar com o nome do contato
              </p>
            </div>

            {/* Botão de Template Padrão */}
            <Button
              onClick={() => setConfig(prev => ({ ...prev, template: defaultTemplate }))}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
            >
              <FileText className="w-4 h-4 mr-1" />
              Usar Template Padrão
            </Button>
          </CardContent>
        </Card>

        {/* Upload de Contatos */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-green-400" />
              Contatos ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload CSV */}
            <div>
              <Label className="text-gray-300">Colar CSV de Contatos</Label>
              <Textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="telefone,nome
11999999999,João Silva
11888888888,Maria Santos"
                rows={6}
                className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  Formato: telefone,nome (primeira linha = cabeçalho)
                </p>
                <Button
                  onClick={() => handleCsvUpload(csvInput)}
                  size="sm"
                  disabled={!csvInput.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Processar
                </Button>
              </div>
            </div>

            {/* Preview dos Contatos */}
            {contacts.length > 0 && (
              <div className="border border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto">
                <h4 className="font-medium text-white mb-2">Preview dos Contatos:</h4>
                <div className="space-y-1 text-sm">
                  {contacts.slice(0, 5).map((contact, index) => (
                    <div key={index} className="text-gray-300">
                      {contact.phone} - {contact.name || 'Sem nome'}
                    </div>
                  ))}
                  {contacts.length > 5 && (
                    <div className="text-gray-400 italic">
                      ... e mais {contacts.length - 5} contatos
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estimativas */}
            {contacts.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-3">
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Estimativas da Campanha
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Total de Mensagens:</span>
                    <div className="text-white font-mono">{estimates.totalMessages}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Lotes:</span>
                    <div className="text-white font-mono">{estimates.totalBatches}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Duração Estimada:</span>
                    <div className="text-white font-mono">{estimates.estimatedDuration}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Taxa/Min:</span>
                    <div className="text-white font-mono">~{config.batchSize / config.delayBetweenBatches}/min</div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Execução */}
            <Button
              onClick={executeCampaign}
              disabled={isProcessing || contacts.length === 0 || !config.template.trim() || !config.name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Executar Campanha
                </>
              )}
            </Button>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-gray-400">
                  Adicionando mensagens à fila inteligente...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas Informativos */}
      <Alert className="border-blue-600 bg-blue-900/20">
        <CheckCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          💡 <strong>Sistema Anti-Bloqueio Ativo:</strong> Suas mensagens serão enviadas automaticamente 
          com intervalos seguros para evitar bloqueios do WhatsApp. O sistema monitora rate limits 
          e pausas automaticamente quando necessário.
        </AlertDescription>
      </Alert>

      {/* Resultados da Campanha */}
      {campaignResults.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Campanha Criada com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-300">
              ✅ {campaignResults.length} mensagens adicionadas à fila inteligente
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Acompanhe o progresso no Dashboard da Fila. As mensagens serão enviadas 
              automaticamente respeitando os limites seguros.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkCampaignManager; 