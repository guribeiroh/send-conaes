import { supabase } from '@/integrations/supabase/client';

export interface WebhookData {
  name: string;
  email: string;
  phone: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  executionId?: string;
}

class WebhookService {
  async sendData(webhookUrl: string, data: WebhookData): Promise<WebhookResponse> {
    // Primeiro, salvar a execução como 'pending'
    const { data: execution, error: insertError } = await supabase
      .from('webhook_executions')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        webhook_url: webhookUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar execução inicial:', insertError);
      return {
        success: false,
        message: 'Erro ao salvar dados da execução'
      };
    }

    try {
      console.log('Enviando requisição para:', webhookUrl);
      console.log('Dados enviados:', data);

      const payload = {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'webhook-form'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('Resposta JSON recebida:', responseData);
      } else {
        const textResponse = await response.text();
        console.log('Resposta texto recebida:', textResponse);
        
        responseData = {
          success: true,
          message: textResponse || 'Dados processados com sucesso'
        };
      }

      // Atualizar a execução com o resultado
      const isSuccess = responseData.success !== false && response.status >= 200 && response.status < 300;
      const status = isSuccess ? 'success' : 'error';
      const message = responseData.message || responseData.msg || responseData.error || 
                     (isSuccess ? 'Dados enviados e processados com sucesso!' : 'Erro ao processar os dados');

      console.log('📊 Atualizando execução:', {
        id: execution.id.substring(0, 8),
        status,
        isSuccess,
        httpStatus: response.status
      });

      const { error: updateError } = await supabase
        .from('webhook_executions')
        .update({
          status,
          response_message: message,
          response_data: responseData,
          http_status: response.status
        })
        .eq('id', execution.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar execução:', updateError);
      } else {
        console.log('✅ Execução atualizada com sucesso para status:', status);
      }

      return {
        success: isSuccess,
        message,
        data: responseData,
        executionId: execution.id
      };

    } catch (error) {
      console.error('Erro na requisição webhook:', error);
      
      // Atualizar a execução com erro
      let errorMessage = 'Erro desconhecido ao enviar dados';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique se a URL do webhook está correta e se o n8n está acessível.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      await supabase
        .from('webhook_executions')
        .update({
          status: 'error',
          response_message: errorMessage,
          response_data: { error: errorMessage }
        })
        .eq('id', execution.id);
      
      return {
        success: false,
        message: errorMessage,
        executionId: execution.id
      };
    }
  }

  async markAsSuccess(executionId?: string, message?: string): Promise<void> {
    if (!executionId) return;
    
    try {
      console.log('✅ Marcando execução como sucesso:', executionId, message);
      
      const { data, error } = await supabase
        .from('webhook_executions')
        .update({
          status: 'success',
          response_message: message || 'Prospecção marcada como bem-sucedida',
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId)
        .select();
      
      if (error) {
        console.error('❌ Erro ao marcar como sucesso:', error);
      } else {
        console.log('✅ Execução marcada como sucesso:', data);
      }
    } catch (error) {
      console.error('💥 Erro inesperado ao marcar execução como sucesso:', error);
    }
  }
}

export const webhookService = new WebhookService();
