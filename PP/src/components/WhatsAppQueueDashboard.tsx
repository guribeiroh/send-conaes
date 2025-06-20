import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';
import { whatsappQueueService } from '@/services/whatsappQueueService';

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  blocked: number;
}

interface InstanceStatus {
  id: string;
  name: string;
  status: string;
  dailyCount: number;
  hourlyCount: number;
  lastUsed: Date;
  rateLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  canSend: boolean;
}

const WhatsAppQueueDashboard: React.FC = () => {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    blocked: 0
  });
  
  const [instances, setInstances] = useState<InstanceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Carregar dados
  const loadData = async () => {
    try {
      const [queueStats, instancesStatus] = await Promise.all([
        whatsappQueueService.getQueueStats(),
        whatsappQueueService.getInstancesStatus()
      ]);
      
      setStats(queueStats);
      setInstances(instancesStatus);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados da fila:', error);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados automaticamente
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Atualizar a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // Ações da fila
  const handlePauseQueue = async () => {
    await whatsappQueueService.pauseQueueManually(30);
    await loadData();
  };

  const handleResumeQueue = async () => {
    await whatsappQueueService.resumeQueue();
    await loadData();
  };

  const handleClearFailed = async () => {
    await whatsappQueueService.clearFailedMessages();
    await loadData();
  };

  const handleReactivateInstance = async (instanceId: string) => {
    await whatsappQueueService.reactivateInstance(instanceId);
    await loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'blocked': return 'bg-red-500';
      case 'inactive': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'blocked': return 'Bloqueada';
      case 'inactive': return 'Inativa';
      case 'maintenance': return 'Manutenção';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Dashboard WhatsApp Queue
          </h2>
          <p className="text-gray-400 text-sm">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handlePauseQueue} 
            variant="outline" 
            size="sm"
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
          >
            <Pause className="w-4 h-4 mr-1" />
            Pausar (30min)
          </Button>
          <Button 
            onClick={handleResumeQueue} 
            variant="outline" 
            size="sm"
            className="border-green-600 text-green-400 hover:bg-green-600/10"
          >
            <Play className="w-4 h-4 mr-1" />
            Retomar
          </Button>
          <Button 
            onClick={loadData} 
            variant="outline" 
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {stats.blocked > 0 && (
        <Alert className="border-red-600 bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            ⚠️ {stats.blocked} instância(s) bloqueada(s) detectada(s). Verifique as configurações.
          </AlertDescription>
        </Alert>
      )}

      {stats.failed > 5 && (
        <Alert className="border-yellow-600 bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            ⚠️ {stats.failed} mensagens falharam. Considere limpar mensagens antigas.
            <Button 
              onClick={handleClearFailed} 
              variant="link" 
              size="sm" 
              className="text-yellow-400 p-0 ml-2"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Limpar falhas
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas da Fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total na Fila
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-gray-400">
              mensagens aguardando
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-gray-400">
              próximas a serem enviadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Enviadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
            <p className="text-xs text-gray-400">
              com sucesso hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Falhadas
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <p className="text-xs text-gray-400">
              precisam de atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status das Instâncias */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-orange-400" />
            Status das Instâncias WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instances.map((instance) => (
              <div key={instance.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`} />
                    <div>
                      <h3 className="font-medium text-white">{instance.name}</h3>
                      <p className="text-sm text-gray-400">
                        {getStatusText(instance.status)} • 
                        Último uso: {new Date(instance.lastUsed).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={instance.canSend ? "default" : "destructive"}
                      className={instance.canSend ? "bg-green-600" : "bg-red-600"}
                    >
                      {instance.canSend ? "Pode Enviar" : "Limitado"}
                    </Badge>
                    
                    {instance.status === 'blocked' && (
                      <Button
                        onClick={() => handleReactivateInstance(instance.id)}
                        size="sm"
                        variant="outline"
                        className="border-green-600 text-green-400 hover:bg-green-600/10"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reativar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contadores de uso */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Uso Horário</p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(instance.hourlyCount / instance.rateLimits.perHour) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className="text-white font-mono text-xs">
                        {instance.hourlyCount}/{instance.rateLimits.perHour}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Uso Diário</p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(instance.dailyCount / instance.rateLimits.perDay) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className="text-white font-mono text-xs">
                        {instance.dailyCount}/{instance.rateLimits.perDay}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Rate Limit</p>
                    <div className="text-white font-mono text-xs">
                      {instance.rateLimits.perMinute}/min
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processamento em Tempo Real */}
      {stats.processing > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Processamento em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-white">
                {stats.processing} mensagem(s) sendo processada(s)...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppQueueDashboard; 