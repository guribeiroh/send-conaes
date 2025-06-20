import { useQuery } from '@tanstack/react-query';
import { prospectionCounterService } from '@/services/prospectionCounterService';

interface ProspectionStats {
  todayCount: number;
  dailyGoal: number;
  progressPercentage: number;
  remainingToGoal: number;
  isGoalReached: boolean;
}

export const useProspectionCounter = () => {
  return useQuery({
    queryKey: ['prospection-counter'],
    queryFn: async (): Promise<ProspectionStats> => {
      console.log('📊 Buscando dados do contador persistente...');
      
      try {
        // Buscar o contador de hoje do banco
        const counter = await prospectionCounterService.getTodayCounter();
        
        if (!counter) {
          console.warn('⚠️ Não foi possível obter o contador de hoje');
          return {
            todayCount: 0,
            dailyGoal: 100,
            progressPercentage: 0,
            remainingToGoal: 100,
            isGoalReached: false
          };
        }

        console.log('✅ Contador obtido:', {
          data: counter.date,
          count: counter.count,
          goal: counter.goal
        });

        const todayCount = counter.count;
        const dailyGoal = counter.goal;
        const progressPercentage = Math.min((todayCount / dailyGoal) * 100, 100);
        const remainingToGoal = Math.max(dailyGoal - todayCount, 0);
        const isGoalReached = todayCount >= dailyGoal;

        const stats = {
          todayCount,
          dailyGoal,
          progressPercentage,
          remainingToGoal,
          isGoalReached
        };

        console.log('📈 STATS FINAIS (do banco):', stats);
        
        return stats;
      } catch (error) {
        console.error('💥 Erro ao buscar contador persistente:', error);
        
        // Em caso de erro, retornar valores padrão
        return {
          todayCount: 0,
          dailyGoal: 100,
          progressPercentage: 0,
          remainingToGoal: 100,
          isGoalReached: false
        };
      }
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos (menos frequente já que é persistente)
    staleTime: 10000, // Dados válidos por 10 segundos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}; 