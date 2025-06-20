import { supabase } from '@/integrations/supabase/client';

interface ProspectionCounter {
  id: string;
  date: string;
  count: number;
  goal: number;
  created_at: string;
  updated_at: string;
}

export class ProspectionCounterService {
  
  /**
   * Busca ou cria o contador para uma data específica
   */
  async getOrCreateCounter(date: string): Promise<ProspectionCounter | null> {
    try {
      console.log('🗓️ Buscando contador para data:', date);
      
      // Primeiro tentar buscar o contador existente
      const { data: existing, error: selectError } = await supabase
        .from('prospection_counter')
        .select('*')
        .eq('date', date)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // Erro diferente de "not found"
        console.error('❌ Erro ao buscar contador:', selectError);
        throw selectError;
      }

      if (existing) {
        console.log('✅ Contador encontrado:', existing);
        return existing;
      }

      // Se não encontrou, criar um novo
      console.log('➕ Criando novo contador para', date);
      const { data: newCounter, error: insertError } = await supabase
        .from('prospection_counter')
        .insert({
          date,
          count: 0,
          goal: 100
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao criar contador:', insertError);
        throw insertError;
      }

      console.log('✅ Novo contador criado:', newCounter);
      return newCounter;
    } catch (error) {
      console.error('💥 Erro no getOrCreateCounter:', error);
      return null;
    }
  }

  /**
   * Incrementa o contador para uma data específica
   */
  async incrementCounter(date: string): Promise<ProspectionCounter | null> {
    try {
      console.log('➕ Incrementando contador para data:', date);
      
      // Buscar ou criar o contador
      const counter = await this.getOrCreateCounter(date);
      if (!counter) {
        throw new Error('Não foi possível obter o contador');
      }

      // Incrementar o count
      const newCount = counter.count + 1;
      
      const { data: updated, error } = await supabase
        .from('prospection_counter')
        .update({ 
          count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', counter.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao incrementar contador:', error);
        throw error;
      }

      console.log('✅ Contador incrementado:', { 
        anterior: counter.count, 
        novo: newCount, 
        data: date 
      });
      
      return updated;
    } catch (error) {
      console.error('💥 Erro no incrementCounter:', error);
      return null;
    }
  }

  /**
   * Busca o contador para hoje
   */
  async getTodayCounter(): Promise<ProspectionCounter | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getOrCreateCounter(today);
  }

  /**
   * Incrementa o contador de hoje
   */
  async incrementTodayCounter(): Promise<ProspectionCounter | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.incrementCounter(today);
  }

  /**
   * Atualiza a meta diária
   */
  async updateGoal(date: string, goal: number): Promise<ProspectionCounter | null> {
    try {
      console.log('🎯 Atualizando meta para:', { date, goal });
      
      const counter = await this.getOrCreateCounter(date);
      if (!counter) {
        throw new Error('Não foi possível obter o contador');
      }

      const { data: updated, error } = await supabase
        .from('prospection_counter')
        .update({ 
          goal,
          updated_at: new Date().toISOString()
        })
        .eq('id', counter.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar meta:', error);
        throw error;
      }

      console.log('✅ Meta atualizada:', updated);
      return updated;
    } catch (error) {
      console.error('💥 Erro no updateGoal:', error);
      return null;
    }
  }

  /**
   * Busca estatísticas históricas
   */
  async getHistoricalStats(days: number = 7): Promise<ProspectionCounter[]> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('prospection_counter')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Erro no getHistoricalStats:', error);
      return [];
    }
  }
}

export const prospectionCounterService = new ProspectionCounterService(); 