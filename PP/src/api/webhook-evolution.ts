// Este arquivo seria usado em um backend Node.js/Express
// Para demonstração, aqui está a estrutura do webhook

import { evolutionService } from '@/services/evolutionService';

export const evolutionWebhookHandler = async (req: any, res: any) => {
  try {
    const webhookData = req.body;
    
    console.log('Webhook Evolution recebido:', JSON.stringify(webhookData, null, 2));
    
    // Verificar se é uma mensagem recebida
    if (webhookData.event === 'messages.upsert') {
      for (const message of webhookData.data) {
        // Processar apenas mensagens recebidas (não enviadas por nós)
        if (!message.key.fromMe) {
          await evolutionService.saveIncomingMessage({
            data: message
          });
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no webhook Evolution:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Exemplo de como configurar no Express:
/*
import express from 'express';
const app = express();

app.use(express.json());

app.post('/webhook/evolution', evolutionWebhookHandler);

app.listen(3001, () => {
  console.log('Servidor webhook rodando na porta 3001');
});
*/ 