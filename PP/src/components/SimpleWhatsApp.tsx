import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { whatsappService } from '@/services/whatsappService';

const SimpleWhatsApp: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState('Verificando...');

  // Testar conexão ao carregar
  useEffect(() => {
    const checkConnection = async () => {
      const apiStatus = await whatsappService.testConnection();
      console.log('Status da API:', apiStatus);
      setConnectionStatus(apiStatus);
    };
    checkConnection();
  }, []);

  const handleSend = async () => {
    if (!phone || !message) {
      alert('Preencha telefone e mensagem');
      return;
    }

    setStatus('sending');
    console.log('🚀 Enviando mensagem...');

    try {
      const success = await whatsappService.sendMessage(phone, message);
      
      if (success) {
        setStatus('success');
        setMessage(''); // Limpar mensagem após envio
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-green-400">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Simples
          </CardTitle>
          <p className="text-xs text-gray-400">
            Status: {connectionStatus}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Telefone */}
          <div>
            <label className="text-sm text-gray-300 block mb-1">
              Telefone:
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11999999999"
              className="bg-gray-700 border-gray-600 text-gray-200"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="text-sm text-gray-300 block mb-1">
              Mensagem:
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
              className="bg-gray-700 border-gray-600 text-gray-200"
            />
          </div>

          {/* Botão Enviar */}
          <Button
            onClick={handleSend}
            disabled={status === 'sending'}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {status === 'sending' ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </>
            )}
          </Button>

          {/* Status */}
          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-900/50 border border-green-600 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">Mensagem enviada!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-600 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">
                Erro ao enviar. Verifique se WhatsApp está conectado.
              </span>
            </div>
          )}

          {/* Instruções */}
          <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded-lg">
            <p className="font-medium text-gray-300 mb-1">Como usar:</p>
            <p>1. Digite o telefone (só números)</p>
            <p>2. Escreva a mensagem</p>
            <p>3. Clique "Enviar WhatsApp"</p>
            <p className="mt-2 text-yellow-400">
              ⚠️ Se der erro, conecte o WhatsApp na Evolution API
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleWhatsApp; 