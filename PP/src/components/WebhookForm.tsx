import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { webhookService } from '@/services/webhookService';
import { whatsappService } from '@/services/whatsappService';
import { useQueryClient } from '@tanstack/react-query';
import MessageTemplateSelector from '@/components/MessageTemplateSelector';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  name: string;
  email: string;
  phone: string;
}

const WEBHOOK_URL = 'https://conaes.rendric.com.br/webhook/38526f14-e801-4587-b7be-0ea53b1dc0bb';

const WebhookForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<'success' | 'error' | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState<'sending' | 'success' | 'error' | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('Verificando...');
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [isCustomSending, setIsCustomSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [lastSelectedTemplateId, setLastSelectedTemplateId] = useState('');
  const queryClient = useQueryClient();

  // Verificar status da API e carregar template salvo
  React.useEffect(() => {
    const checkStatus = async () => {
      const status = await whatsappService.testConnection();
      setApiStatus(status);
    };
    checkStatus();

    // Carregar último template selecionado
    const savedTemplateId = localStorage.getItem('lastSelectedTemplateId');
    if (savedTemplateId) {
      setLastSelectedTemplateId(savedTemplateId);
    }
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset response status when user changes form data
    if (responseStatus) {
      setResponseStatus(null);
      setResponseMessage('');
      setWhatsappStatus(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Por favor, insira seu nome');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Por favor, insira um email válido');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('Por favor, insira seu telefone');
      return false;
    }
    return true;
  };

  const sendWhatsAppMessage = async (phoneNumber: string, messageToSend: string) => {
    setWhatsappStatus('sending');

    try {
      console.log('📱 Enviando WhatsApp via serviço funcionando...');
      console.log('📝 Mensagem:', messageToSend.substring(0, 100) + '...');
      
      // Usar o serviço WhatsApp que está funcionando
      const success = await whatsappService.sendMessage(phoneNumber, messageToSend);
      
      if (success) {
        setWhatsappStatus('success');
        toast.success('Mensagem WhatsApp enviada com sucesso!');
        return true;
      } else {
        throw new Error('Falha ao enviar mensagem WhatsApp');
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar WhatsApp:', error);
      setWhatsappStatus('error');
      
      toast.error('Erro ao enviar WhatsApp', {
        description: 'Verifique se o WhatsApp está conectado na Evolution API',
        duration: 8000,
      });
      return false;
    }
  };

  // Nova função para salvar a mensagem real no banco
  const saveMessageToDatabase = async (executionId: string, realMessage: string, status: 'success' | 'error' = 'success') => {
    try {
      console.log('💾 [SAVE] Salvando mensagem real no banco:', {
        executionId: executionId.substring(0, 8),
        messagePreview: realMessage.substring(0, 50) + '...',
        status
      });

      const { data, error } = await supabase
        .from('webhook_executions')
        .update({
          status: status,
          response_message: realMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId)
        .select();

      if (error) {
        console.error('❌ [SAVE] Erro ao salvar mensagem:', error);
        return false;
      }

      console.log('✅ [SAVE] Mensagem salva com sucesso:', data);
      return true;
    } catch (error) {
      console.error('💥 [SAVE] Erro inesperado:', error);
      return false;
    }
  };

  const sendCustomMessage = async () => {
    if (!customMessage.trim() || !formData.phone.trim() || !formData.name.trim()) {
      toast.error('Preencha o nome, telefone e mensagem');
      return;
    }

    setIsCustomSending(true);
    
    try {
      console.log('📱 [CUSTOM] Enviando mensagem personalizada...');
      
      // 1. Salvar execução no banco como 'pending'
      const { data: execution, error: insertError } = await supabase
        .from('webhook_executions')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          webhook_url: 'CUSTOM_MESSAGE',
          status: 'pending',
          response_message: customMessage
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [CUSTOM] Erro ao salvar execução:', insertError);
        throw new Error('Erro ao salvar dados da mensagem');
      }

      console.log('✅ [CUSTOM] Execução salva:', execution.id.substring(0, 8));
      
      // 2. Enviar WhatsApp
      const success = await whatsappService.sendMessage(formData.phone, customMessage);
      
      if (success) {
        console.log('✅ [CUSTOM] WhatsApp enviado, atualizando para success...');
        
        // 3. Salvar mensagem real usando a função dedicada
        await saveMessageToDatabase(execution.id, `Mensagem personalizada: ${customMessage}`);

        // 4. Atualizar UI e cache
        queryClient.invalidateQueries({ queryKey: ['message-history'] });
        queryClient.invalidateQueries({ queryKey: ['webhook-executions'] });
        
        toast.success('Mensagem personalizada enviada!');
        setCustomMessage('');
        setShowCustomMessage(false);
      } else {
        // Marcar como erro no banco
        await saveMessageToDatabase(execution.id, 'Falha ao enviar WhatsApp', 'error');
        throw new Error('Falha ao enviar mensagem');
      }
    } catch (error: any) {
      console.error('❌ [CUSTOM] Erro ao enviar mensagem personalizada:', error);
      toast.error('Erro ao enviar mensagem', {
        description: 'Verifique se o WhatsApp está conectado na Evolution API',
        duration: 8000,
      });
    } finally {
      setIsCustomSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setResponseStatus(null);
    setResponseMessage('');
    setWhatsappStatus(null);

    console.log('Enviando dados para webhook:', { formData, webhookUrl: WEBHOOK_URL });

    let webhookResponse = null;
    let whatsappSuccess = false;

    try {
      // 1. Primeiro enviar para o webhook
      webhookResponse = await webhookService.sendData(WEBHOOK_URL, formData);
      
      console.log('Resposta do webhook recebida:', webhookResponse);
      
      // 2. Preparar a mensagem que será enviada
      let messageToSend = '';
      if (selectedTemplate.trim()) {
        messageToSend = selectedTemplate;
      } else {
        messageToSend = `Olá ${formData.name}! 👋

Obrigado por se cadastrar no Conaes! 

🎯 Estamos muito felizes em tê-lo(a) conosco.

Nossa equipe entrará em contato em breve para apresentar nossas soluções e como podemos ajudá-lo(a) a alcançar seus objetivos.

Se tiver alguma dúvida, fique à vontade para responder esta mensagem.

Bem-vindo(a) à família Conaes! 🚀`;
      }

      // 3. Enviar mensagem WhatsApp independente do webhook
      try {
        whatsappSuccess = await sendWhatsAppMessage(formData.phone, messageToSend);
      } catch (whatsappError) {
        console.error('Erro no WhatsApp:', whatsappError);
        whatsappSuccess = false;
      }

      // 4. Determinar se a prospecção foi bem-sucedida
      // Uma prospecção é bem-sucedida se pelo menos o WhatsApp foi enviado
      const prospectionSuccess = whatsappSuccess || webhookResponse?.success;
      
      if (prospectionSuccess) {
        // SEMPRE salvar a mensagem real no banco quando houver executionId
        if (webhookResponse?.executionId) {
          console.log('💾 [MAIN] Forçando salvamento da mensagem real...');
          await saveMessageToDatabase(webhookResponse.executionId, messageToSend);
          
          // Forçar refresh do feed após salvar
          console.log('🔄 [MAIN] Forçando refresh do cache...');
          queryClient.invalidateQueries({ queryKey: ['message-history'] });
          queryClient.invalidateQueries({ queryKey: ['webhook-executions'] });
        } else {
          console.warn('⚠️ [MAIN] Nenhum executionId encontrado para salvar mensagem');
        }
        
        setResponseStatus('success');
        setResponseMessage('Prospecção realizada com sucesso!');
        toast.success('Prospecção realizada com sucesso!');
        
        // Reset form after successful submission
        setFormData({ name: '', email: '', phone: '' });
        
        // Criar/atualizar contato na base de dados
        console.log('📞 Salvando contato na base de dados...');
        try {
          // Limpar telefone
          const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
          const normalizedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          
          // Tentar inserir contato
          const { data: contactResult, error: contactError } = await supabase
            .from('contacts' as any)
            .insert({
              name: formData.name,
              email: formData.email,
              phone: normalizedPhone,
              source: 'prospecção_ativa',
              status: 'prospectado'
            })
            .select()
            .single();

          if (contactError) {
            // Se for erro de duplicata (unique constraint), apenas loggar
            if (contactError.code === '23505') {
              console.log('📞 Contato já existe, atualizando contador...');
              // Aqui poderíamos incrementar o contact_count se necessário
            } else {
              console.error('❌ Erro ao salvar contato:', contactError);
            }
          } else {
            console.log('✅ Novo contato criado:', contactResult);
          }
        } catch (contactErr) {
          console.error('💥 Erro inesperado ao salvar contato:', contactErr);
        }

        // Atualizar contador de prospecção PERSISTENTE
        console.log('🔄 Incrementando contador persistente após prospecção bem-sucedida...');
        
        try {
          // Incrementar o contador no banco de dados
          const counterResult = await import('@/services/prospectionCounterService')
            .then(module => module.prospectionCounterService.incrementTodayCounter());
          
          if (counterResult) {
            console.log('✅ Contador persistente incrementado:', {
              count: counterResult.count,
              goal: counterResult.goal,
              date: counterResult.date
            });
            
            // Invalidar cache para atualizar a UI
            queryClient.invalidateQueries({ queryKey: ['prospection-counter'] });
            queryClient.invalidateQueries({ queryKey: ['message-history'] });
            
            // Incremento otimista para feedback imediato
            queryClient.setQueryData(['prospection-counter'], (oldData: any) => {
              if (oldData) {
                console.log('📈 Aplicando incremento otimista baseado no banco');
                return {
                  ...oldData,
                  todayCount: counterResult.count,
                  progressPercentage: Math.min((counterResult.count / counterResult.goal) * 100, 100),
                  remainingToGoal: Math.max(counterResult.goal - counterResult.count, 0),
                  isGoalReached: counterResult.count >= counterResult.goal
                };
              }
              return oldData;
            });
          } else {
            console.error('❌ Falha ao incrementar contador persistente');
            // Fallback: apenas invalidar queries
            queryClient.invalidateQueries({ queryKey: ['prospection-counter'] });
            queryClient.invalidateQueries({ queryKey: ['message-history'] });
          }
        } catch (error) {
          console.error('💥 Erro ao incrementar contador persistente:', error);
          // Fallback: apenas invalidar queries
          queryClient.invalidateQueries({ queryKey: ['prospection-counter'] });
          queryClient.invalidateQueries({ queryKey: ['message-history'] });
        }
      } else {
        setResponseStatus('error');
        setResponseMessage(webhookResponse?.message || 'Erro ao processar prospecção');
        toast.error('Erro ao processar prospecção');
      }
    } catch (error) {
      console.error('Erro ao processar prospecção:', error);
      setResponseStatus('error');
      setResponseMessage('Erro de conexão. Tente novamente em alguns instantes.');
      toast.error('Erro de conexão. Tente novamente em alguns instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="shadow-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Prospecção Ativa
          </CardTitle>
          <p className="text-sm text-gray-400 mt-2">
            Preencha os dados do prospect para iniciar o contato
          </p>
          <div className="text-sm mt-3 flex items-center justify-center gap-2 p-2 bg-gray-700 rounded-lg">
            <span className="text-gray-300">Status WhatsApp:</span>
            <span className={apiStatus.includes('✅') ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {apiStatus}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-10 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="h-10 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                disabled={isLoading}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-300">
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="h-10 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                disabled={isLoading}
              />
            </div>

            {/* Template Selector */}
            <div className="space-y-3 pt-4 border-t border-gray-600">
              <Label className="text-sm font-medium text-gray-300">
                Selecionar Template para WhatsApp
              </Label>
              
                              <div className="space-y-1">
                <MessageTemplateSelector
                  onSelectTemplate={(templateMessage: string, templateId?: string) => {
                    setSelectedTemplate(templateMessage);
                    if (templateId) {
                      setLastSelectedTemplateId(templateId);
                      localStorage.setItem('lastSelectedTemplateId', templateId);
                    }
                  }}
                  defaultVariables={{
                    nome: formData.name || 'Cliente',
                    telefone: formData.phone,
                    email: formData.email
                  }}
                  preSelectedTemplateId={lastSelectedTemplateId}
                />
                
                {selectedTemplate && (
                  <div className="bg-gray-700 rounded-lg p-2 max-h-24 overflow-y-auto scrollbar-message">
                    <Label className="text-xs text-gray-400 mb-1 block">
                      Preview da mensagem:
                      {formData.name && (
                        <span className="text-green-400 ml-2">
                          ✓ Nome "{formData.name}" será inserido automaticamente
                        </span>
                      )}
                    </Label>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap">
                      {selectedTemplate.substring(0, 150)}
                      {selectedTemplate.length > 150 ? '...' : ''}
                    </p>
                  </div>
                )}
                
                {!selectedTemplate && (
                  <p className="text-xs text-gray-500 italic">
                    Selecione um template ou será enviada a mensagem padrão
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50 border-0 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {whatsappStatus === 'sending' ? 'Enviando WhatsApp...' : 'Prospectando...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Prospectar
                </>
              )}
            </Button>
          </form>

          {/* Seção de Mensagem Personalizada */}
          <div className="border-t border-gray-600 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-300">
                Mensagem Personalizada
              </Label>
              <Button
                type="button"
                onClick={() => setShowCustomMessage(!showCustomMessage)}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-sm border-gray-600 text-gray-400 hover:bg-gray-700"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {showCustomMessage ? 'Fechar' : 'Abrir'}
              </Button>
            </div>

            {showCustomMessage && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <MessageTemplateSelector
                    onSelectTemplate={(templateMessage) => setCustomMessage(templateMessage)}
                    defaultVariables={{
                      nome: formData.name || 'Cliente',
                      telefone: formData.phone,
                      email: formData.email
                    }}
                  />
                </div>
                
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem personalizada..."
                  className="min-h-[60px] bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 text-sm scrollbar-message"
                  disabled={isCustomSending}
                />
                
                <Button
                  onClick={sendCustomMessage}
                  disabled={!customMessage.trim() || !formData.phone.trim() || !formData.name.trim() || isCustomSending}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-base"
                >
                  {isCustomSending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>


        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookForm;
