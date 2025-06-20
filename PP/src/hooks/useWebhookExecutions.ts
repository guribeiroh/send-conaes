import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type WebhookExecution = Tables<'webhook_executions'>;
type WebhookExecutionInsert = TablesInsert<'webhook_executions'>;

export const useWebhookExecutions = () => {
  return useQuery({
    queryKey: ['webhook-executions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_executions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WebhookExecution[];
    },
  });
};

export const useCreateWebhookExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (execution: WebhookExecutionInsert) => {
      const { data, error } = await supabase
        .from('webhook_executions')
        .insert(execution)
        .select()
        .single();
      
      if (error) throw error;
      return data as WebhookExecution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-executions'] });
    },
  });
};

export const useUpdateWebhookExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WebhookExecution> }) => {
      const { data, error } = await supabase
        .from('webhook_executions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WebhookExecution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-executions'] });
    },
  });
};

export interface MessageHistory {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'enviado' | 'entregue' | 'lido' | 'erro' | 'success' | 'pending';
  created_at: string;
  updated_at: string;
  source?: string;
  contact_count?: number;
}

export const useMessageHistory = () => {
  return useQuery({
    queryKey: ['message-history'],
    queryFn: async (): Promise<MessageHistory[]> => {
      console.log('📱 [DEBUG] Buscando histórico real de mensagens...');
      
      try {
        // 1. Buscar TODAS as execuções de webhook (não só success) dos últimos dias
        const { data: executions, error: execError } = await supabase
          .from('webhook_executions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (execError) {
          console.error('❌ [DEBUG] Erro ao buscar execuções:', execError);
          return [];
        }

        console.log('✅ [DEBUG] Execuções encontradas:', executions?.length);
        console.log('📊 [DEBUG] Status das execuções:', executions?.map(e => ({
          id: e.id.substring(0, 8),
          status: e.status,
          name: e.name,
          created_at: e.created_at
        })));

        // 2. Buscar contatos correspondentes (temporariamente desabilitado para debug)
        const contacts: any[] = [];
        console.log('⚠️ [DEBUG] Busca de contatos temporariamente desabilitada');

        // 3. Combinar dados de execuções e contatos
        const messageHistory: MessageHistory[] = [];

        // Adicionar TODAS as execuções de webhook (não só success)
        executions?.forEach(execution => {
          console.log(`🔍 [DEBUG] Processando execução ${execution.id.substring(0, 8)}:`, {
            status: execution.status,
            name: execution.name,
            phone: execution.phone,
            created_at: execution.created_at
          });

          const correspondingContact = contacts?.find(contact => 
            contact && contact.phone === execution.phone || contact && contact.email === execution.email
          );

          // Determinar mensagem e status
          let message = execution.response_message || 'Mensagem não disponível';
          let mappedStatus: MessageHistory['status'] = 'pending';

          console.log(`🔍 [DEBUG] Mensagem da execução ${execution.id.substring(0, 8)}:`, {
            hasResponseMessage: !!execution.response_message,
            messagePreview: execution.response_message ? execution.response_message.substring(0, 50) + '...' : 'Nenhuma',
            status: execution.status
          });

          // Se não tem response_message, usar mensagens padrão
          if (!execution.response_message) {
            if (execution.status === 'success') {
              message = 'Mensagem enviada via prospecção ativa';
              mappedStatus = 'success';
            } else if (execution.status === 'pending') {
              message = 'Prospecção em andamento...';
              mappedStatus = 'pending';
            } else if (execution.status === 'error') {
              message = 'Erro na prospecção';
              mappedStatus = 'erro';
            } else {
              message = `Prospecção ${execution.status}`;
              mappedStatus = 'enviado';
            }
          } else {
            // Mapear apenas o status, manter a mensagem real
            if (execution.status === 'success') {
              mappedStatus = 'success';
            } else if (execution.status === 'pending') {
              mappedStatus = 'pending';
            } else if (execution.status === 'error') {
              mappedStatus = 'erro';
            } else {
              mappedStatus = 'enviado';
            }
          }

          messageHistory.push({
            id: execution.id,
            name: execution.name,
            email: execution.email,
            phone: execution.phone,
            message: message,
            status: mappedStatus,
            created_at: execution.created_at,
            updated_at: execution.updated_at,
            source: 'webhook_execution',
            contact_count: correspondingContact?.contact_count || 1
          });
        });

        console.log('📊 [DEBUG] Mensagens das execuções adicionadas:', messageHistory.length);

        // 4. Contatos únicos temporariamente desabilitados
        console.log('⚠️ [DEBUG] Adição de contatos únicos temporariamente desabilitada');

        // 5. Ordenar por data mais recente
        messageHistory.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        console.log('📊 [DEBUG] Total de mensagens no histórico:', messageHistory.length);
        console.log('📋 [DEBUG] Resumo das mensagens:', messageHistory.map(m => ({
          id: m.id.substring(0, 8),
          name: m.name,
          status: m.status,
          source: m.source,
          created_at: m.created_at
        })));
        
        return messageHistory.slice(0, 15); // Limitar a 15 itens mais recentes
      } catch (error) {
        console.error('💥 [DEBUG] Erro ao buscar histórico:', error);
        return [];
      }
    },
    refetchInterval: 15000, // Atualizar a cada 15 segundos
    staleTime: 5000, // Considerar dados "frescos" por 5 segundos
    retry: 3,
    retryDelay: 1000,
  });
};

// Função utilitária para formatar tempo relativo
export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'agora';
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d atrás`;
};
