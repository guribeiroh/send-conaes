import WebhookForm from '@/components/WebhookForm';
import LogoutButton from '@/components/LogoutButton';
import ProspectionCounter from '@/components/ProspectionCounter';
import EvolutionConfigModal from '@/components/EvolutionConfigModal';
import EvolutionInstructions from '@/components/EvolutionInstructions';
import MessageTemplateManager from '@/components/MessageTemplateManager';
import WhatsAppQueueDashboard from '@/components/WhatsAppQueueDashboard';
import BulkCampaignManager from '@/components/BulkCampaignManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, MessageSquare, Clock, User, AlertCircle, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMessageHistory, formatRelativeTime } from '@/hooks/useWebhookExecutions';
import React, { useState } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { data: messageHistory, isLoading: isLoadingHistory } = useMessageHistory();
  const [activeTab, setActiveTab] = useState('prospection');

  // Debug logs
  React.useEffect(() => {
    console.log('🔍 [INDEX] Estado do messageHistory:', {
      isLoading: isLoadingHistory,
      dataLength: messageHistory?.length,
      data: messageHistory?.map(m => ({
        id: m.id.substring(0, 8),
        name: m.name,
        status: m.status,
        source: m.source,
        created_at: m.created_at
      }))
    });
  }, [messageHistory, isLoadingHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lido': return 'text-green-400';
      case 'entregue': return 'text-blue-400';
      case 'enviado': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'pending': return 'text-orange-400';
      case 'erro': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lido': return <span className="text-green-400">✓✓</span>;
      case 'entregue': return <span className="text-blue-400">✓</span>;
      case 'enviado': return <span className="text-yellow-400">⏳</span>;
      case 'success': return <span className="text-green-400">🎯</span>;
      case 'pending': return <span className="text-orange-400">⏳</span>;
      case 'erro': return <AlertCircle className="w-3 h-3 text-red-400" />;
      default: return <span className="text-gray-400">❓</span>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'lido': return 'Lida';
      case 'entregue': return 'Entregue';
      case 'enviado': return 'Enviada';
      case 'success': return 'Sucesso';
      case 'pending': return 'Pendente';
      case 'erro': return 'Erro';
      default: return status;
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      // +55 11 99999-9999
      return `+55 ${cleaned.substring(2, 4)} ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
    }
    return phone;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col overflow-hidden">
      {/* Header Compacto */}
      <div className="flex-shrink-0 px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Prospecção Ativa Conaes
            </h1>
            <p className="text-gray-400 text-xs">
              Sistema de disparo automático com fila anti-bloqueio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/simple')}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-7 px-2"
            >
              <Zap className="w-3 h-3 mr-1" />
              Simples
            </Button>
            <MessageTemplateManager />
            <EvolutionInstructions />
            <EvolutionConfigModal />
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Sistema de Abas */}
      <div className="flex-1 px-3 py-2 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger 
              value="prospection" 
              className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <MessageSquare className="w-4 h-4" />
              Prospecção
            </TabsTrigger>
            <TabsTrigger 
              value="queue" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Activity className="w-4 h-4" />
              Fila WhatsApp
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4" />
              Campanhas
            </TabsTrigger>
          </TabsList>

          {/* Aba de Prospecção (Layout Original) */}
          <TabsContent value="prospection" className="flex-1 min-h-0 mt-3">
            <div className="h-full flex gap-3">
              {/* Coluna 1 - Contador Expandido */}
              <div className="flex-1 min-w-0">
                <div className="h-full">
                  <ProspectionCounter />
                </div>
              </div>

              {/* Coluna 2 - Formulário Expandido */}
              <div className="flex-1 min-w-0">
                <div className="h-full flex items-center justify-center">
                  <div className="w-full max-w-lg">
                    <WebhookForm />
                  </div>
                </div>
              </div>

              {/* Coluna 3 - Feed Histórico Expandido */}
              <div className="flex-1 min-w-0">
                <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold text-gray-200">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        Mensagens Enviadas
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log('🔄 [DEBUG] Forçando refresh do feed...');
                            window.location.reload();
                          }}
                          className="h-6 px-2 text-xs border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          🔄 Refresh
                        </Button>
                        {messageHistory && (
                          <span className="text-xs text-gray-400">
                            {messageHistory.length} total
                          </span>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto space-y-2 pb-3 scrollbar-sexy">
                    {isLoadingHistory ? (
                      <div className="text-center py-8 text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Carregando histórico...</p>
                      </div>
                    ) : messageHistory && messageHistory.length > 0 ? (
                      messageHistory.map((msg) => (
                        <div key={msg.id} className="bg-gray-700 rounded-lg p-3 border border-gray-600 hover:bg-gray-650 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-200 truncate">
                                {msg.name}
                              </span>
                              {msg.contact_count && msg.contact_count > 1 && (
                                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {msg.contact_count}x
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {getStatusIcon(msg.status)}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 mb-2 truncate">
                            📞 {formatPhone(msg.phone)}
                          </div>
                          
                          <div className="text-xs text-gray-300 mb-2">
                            <div className="font-medium text-gray-200 mb-1">Mensagem enviada:</div>
                            <div className="bg-gray-600 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs scrollbar-message">
                              {msg.message}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(msg.created_at)}
                            </span>
                            {msg.source && (
                              <span className="text-xs text-gray-500 bg-gray-600 px-1.5 py-0.5 rounded">
                                {msg.source === 'webhook_execution' ? '🎯 Prospecção' : '📞 Contato'}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${getStatusColor(msg.status)}`}>
                              {getStatusText(msg.status)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium mb-2">Nenhuma mensagem ainda</p>
                        <p className="text-sm">As mensagens enviadas aparecerão aqui</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Aba da Fila WhatsApp */}
          <TabsContent value="queue" className="flex-1 min-h-0 mt-3">
            <div className="h-full overflow-y-auto">
              <WhatsAppQueueDashboard />
            </div>
          </TabsContent>

          {/* Aba de Campanhas */}
          <TabsContent value="campaigns" className="flex-1 min-h-0 mt-3">
            <div className="h-full overflow-y-auto">
              <BulkCampaignManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Mínimo */}
      <div className="flex-shrink-0 px-4 py-1">
        <p className="text-gray-500 text-xs text-center">
          Sistema Conaes © 2024
        </p>
      </div>
    </div>
  );
};

export default Index;
