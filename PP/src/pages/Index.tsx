import WebhookForm from '@/components/WebhookForm';
import LogoutButton from '@/components/LogoutButton';
import ProspectionCounter from '@/components/ProspectionCounter';
import EvolutionConfigModal from '@/components/EvolutionConfigModal';
import EvolutionInstructions from '@/components/EvolutionInstructions';
import MessageTemplateManager from '@/components/MessageTemplateManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, MessageSquare, Clock, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMessageHistory, formatRelativeTime } from '@/hooks/useWebhookExecutions';
import React from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { data: messageHistory, isLoading: isLoadingHistory } = useMessageHistory();

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
              Sistema de disparo automático
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

      {/* Conteúdo Principal - Layout 3 Colunas Expandido */}
      <div className="flex-1 flex px-3 gap-3 min-h-0 py-2">
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
                      {msg.message?.includes('Mensagem personalizada:') && (
                        <span className="text-xs text-purple-400 bg-purple-900 px-1.5 py-0.5 rounded">
                          ✨ Personalizada
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem enviada ainda</p>
                  <p className="text-xs text-gray-500 mt-1">
                    As mensagens aparecerão aqui após o envio
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
