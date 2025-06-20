import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, CheckCircle, Clock, Calendar, RefreshCw, Database } from 'lucide-react';
import { useProspectionCounter } from '@/hooks/useProspectionCounter';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
const ProspectionCounter: React.FC = () => {
  const { data: stats, isLoading, error, refetch } = useProspectionCounter();
  const queryClient = useQueryClient();
  const [previousCount, setPreviousCount] = useState<number>(0);
  const [showIncrement, setShowIncrement] = useState(false);

  // Detectar quando houve um incremento para mostrar animação
  useEffect(() => {
    if (stats?.todayCount && stats.todayCount > previousCount && previousCount > 0) {
      setShowIncrement(true);
      toast.success(`🎉 Nova prospecção! Total: ${stats.todayCount}`, {
        duration: 3000,
      });
      
      setTimeout(() => setShowIncrement(false), 2000);
    }
    if (stats?.todayCount !== undefined) {
      setPreviousCount(stats.todayCount);
    }
  }, [stats?.todayCount, previousCount]);

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700 h-full flex items-center justify-center">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-gray-400 text-sm">Carregando contador...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700 h-full flex items-center justify-center">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-400 mb-3">
              <Database className="w-8 h-8 mx-auto mb-2" />
              Erro ao carregar dados
            </div>
            <Button 
              onClick={() => refetch()} 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const handleForceRefresh = () => {
    console.log('🔄 Forçando atualização do contador...');
    queryClient.invalidateQueries({ queryKey: ['prospection-counter'] });
    refetch();
    toast.success('Contador atualizado!');
  };

  const handleTestIncrement = () => {
    console.log('🧪 Simulando incremento para teste...');
    // Simular um incremento temporário
    queryClient.setQueryData(['prospection-counter'], (oldData: any) => {
      if (oldData) {
        const newCount = oldData.todayCount + 1;
        return {
          ...oldData,
          todayCount: newCount,
          progressPercentage: Math.min((newCount / oldData.dailyGoal) * 100, 100),
          remainingToGoal: Math.max(oldData.dailyGoal - newCount, 0),
          isGoalReached: newCount >= oldData.dailyGoal
        };
      }
      return oldData;
    });
    toast.success('Contador incrementado! (teste)');
  };

  const getStatusIcon = () => {
    if (stats.isGoalReached) {
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    }
    return <Clock className="w-6 h-6 text-blue-400" />;
  };

  const getStatusMessage = () => {
    if (stats.isGoalReached) {
      return 'Meta atingida! 🎉';
    }
    if (stats.progressPercentage >= 75) {
      return 'Quase lá! Continue assim! 💪';
    }
    if (stats.progressPercentage >= 50) {
      return 'Boa! Você está no meio do caminho! 🚀';
    }
    if (stats.todayCount > 0) {
      return 'Começou bem! Vamos continuar! 📈';
    }
    return 'Vamos começar a prospecção de hoje! 🎯';
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-200">
            <Target className="w-5 h-5 text-green-400" />
            Contador Diário
          </CardTitle>
          <Button
            onClick={handleForceRefresh}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-400 hover:text-green-400"
            title="Atualizar contador"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          {getCurrentDate()}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between space-y-6">
        {/* Números principais expandidos */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`text-center bg-gray-700 rounded-lg p-4 transition-all duration-500 ${
              showIncrement ? 'scale-105 bg-green-800 shadow-lg shadow-green-500/20' : ''
            }`}>
              <div className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                showIncrement ? 'text-green-300' : 'text-green-400'
              }`}>
                {stats.todayCount}
                {showIncrement && (
                  <span className="ml-2 text-lg animate-bounce">🎯</span>
                )}
              </div>
              <div className="text-sm text-gray-400">Hoje</div>
            </div>
            <div className="text-center bg-gray-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-gray-300 mb-1">
                {stats.dailyGoal}
              </div>
              <div className="text-sm text-gray-400">Meta</div>
            </div>
          </div>

          {/* Estatísticas adicionais */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-400">
                {stats.progressPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Progresso</div>
            </div>
            
            {!stats.isGoalReached && (
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {stats.remainingToGoal}
                </div>
                <div className="text-xs text-gray-400">Restantes</div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Progresso do Dia</span>
            <span className="text-sm font-medium text-gray-300">
              {stats.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={stats.progressPercentage} 
            className="h-3 bg-gray-700"
          />
        </div>

        {/* Status motivacional */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm text-gray-200 font-medium">
                {getStatusMessage()}
              </p>
            </div>
          </div>


        </div>

        {/* Indicador de atualização + Forçar update */}
        <div className="text-center space-y-2">
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Dados persistentes - Atualização a cada 30s</span>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleForceRefresh}
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2 border-blue-600/50 text-blue-400 hover:bg-blue-900/20"
            >
              🔄 Atualizar Agora
            </Button>
            

            
            {/* Botão de teste (remover em produção) */}
            <Button
              onClick={handleTestIncrement}
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2 border-green-600/50 text-green-400 hover:bg-green-900/20"
            >
              🧪 Testar +1
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProspectionCounter; 