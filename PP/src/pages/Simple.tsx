import React from 'react';
import SimpleWhatsApp from '@/components/SimpleWhatsApp';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Simple: React.FC = () => {
  const navigate = useNavigate();

  const openEvolutionManager = () => {
    window.open('http://evo.conaesbrasil.com.br/manager', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Header com Navegação */}
      <div className="flex-shrink-0 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              WhatsApp Evolution API
            </h1>
            <p className="text-gray-400 text-sm">
              Versão simplificada para disparo de mensagens
            </p>
          </div>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Página Principal
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Componente Principal */}
        <SimpleWhatsApp />

        {/* Links e Instruções */}
        <div className="mt-8 max-w-lg text-center space-y-4">
          <Button
            onClick={openEvolutionManager}
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Manager Evolution
          </Button>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">
              ⚠️ Se der erro ao enviar:
            </h3>
            <div className="text-xs text-gray-300 space-y-1">
              <p>1. Clique em "Abrir Manager Evolution" acima</p>
              <p>2. Encontre a instância "gustavo" na lista</p>
              <p>3. Clique no botão "Connect" da instância</p>
              <p>4. Escaneie o QR Code com seu WhatsApp</p>
              <p>5. Aguarde o status ficar "Online" e teste novamente</p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <h3 className="text-sm font-medium text-green-400 mb-1">
              💡 Dica de Uso
            </h3>
            <p className="text-xs text-gray-300">
              Esta versão é ideal para testes rápidos. Para uso completo com captura automática, 
              use a página principal do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 text-center border-t border-gray-700">
        <p className="text-xs text-gray-500">
          Evolution API: evo.conaesbrasil.com.br | Instância: gustavo
        </p>
      </div>
    </div>
  );
};

export default Simple; 