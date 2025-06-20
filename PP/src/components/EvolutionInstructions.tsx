import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, QrCode, Settings, CheckCircle } from 'lucide-react';

const EvolutionInstructions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-700 border-blue-600 text-blue-200 hover:bg-blue-600"
        >
          <Settings className="w-4 h-4 mr-2" />
          Como Configurar WhatsApp
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-blue-400 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Configurar WhatsApp na Evolution API
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Atual */}
          <Alert className="border-yellow-600 bg-yellow-900/50">
            <AlertDescription className="text-yellow-200">
              <strong>⚠️ Status:</strong> WhatsApp não conectado na instância "gustavo"
            </AlertDescription>
          </Alert>

          {/* Passo a Passo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-400">📋 Instruções Passo a Passo:</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-200">Acesse o Manager da Evolution</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Clique no link abaixo para acessar o painel de controle:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                    onClick={() => window.open('http://evo.conaesbrasil.com.br/manager', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Manager Evolution
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-200">Localize a Instância "gustavo"</h4>
                  <p className="text-sm text-gray-400">
                    No painel, procure pela instância chamada <strong>"gustavo"</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-200">Conectar WhatsApp</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Clique em "Connect" ou "Conectar" na instância gustavo
                  </p>
                  <p className="text-xs text-yellow-400">
                    💡 Um QR Code será exibido na tela
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-200">Escanear QR Code</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    No seu WhatsApp:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Toque nos 3 pontos (menu)</li>
                    <li>• Selecione "Dispositivos conectados"</li>
                    <li>• Toque em "Conectar um dispositivo"</li>
                    <li>• Escaneie o QR Code da tela</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-900/50 rounded-lg border border-green-600">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  5
                </div>
                <div>
                  <h4 className="font-medium text-green-200">Aguardar Conexão</h4>
                  <p className="text-sm text-green-300">
                    Aguarde até ver "Conectado" ou "Connected" na instância
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">
                      Pronto! Agora você pode enviar mensagens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2">🔥 Dicas Importantes:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• O WhatsApp só pode estar conectado em UM dispositivo por vez</li>
              <li>• Se já estiver usando WhatsApp Web, desconecte primeiro</li>
              <li>• A conexão pode demorar alguns segundos</li>
              <li>• Depois de conectar, teste enviando uma mensagem pelo formulário</li>
            </ul>
          </div>

          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Entendi, vou configurar agora!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvolutionInstructions; 