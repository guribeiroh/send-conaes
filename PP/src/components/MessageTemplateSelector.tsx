import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus, Edit, Trash2, Copy, MessageSquare } from 'lucide-react';
import { messageTemplateService } from '@/services/messageTemplateService';
import type { MessageTemplate } from '@/types/messageTemplate';
import { toast } from 'sonner';

interface MessageTemplateSelectorProps {
  onSelectTemplate: (message: string, templateId?: string) => void;
  defaultVariables?: Record<string, string>;
  preSelectedTemplateId?: string;
}

const MessageTemplateSelector: React.FC<MessageTemplateSelectorProps> = ({
  onSelectTemplate,
  defaultVariables = {},
  preSelectedTemplateId = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Carregar templates e pré-selecionar se necessário
  useEffect(() => {
    loadTemplates();
  }, []);

  // Pré-selecionar template se fornecido
  useEffect(() => {
    if (preSelectedTemplateId && templates.length > 0 && !selectedTemplate) {
      const preSelected = templates.find(t => t.id === preSelectedTemplateId);
      if (preSelected) {
        setSelectedTemplate(preSelected);
      }
    }
  }, [preSelectedTemplateId, templates, selectedTemplate]);

  // Atualizar variáveis quando template é selecionado ou defaultVariables mudam
  useEffect(() => {
    if (selectedTemplate) {
      const newVariables = { ...defaultVariables };
      selectedTemplate.variables.forEach(variable => {
        if (!newVariables[variable]) {
          newVariables[variable] = '';
        }
      });
      setVariables(newVariables);

      // Auto-aplicar template sempre que as variáveis mudarem
      const processedMessage = messageTemplateService.processTemplate(selectedTemplate, newVariables);
      onSelectTemplate(processedMessage, selectedTemplate.id);
    }
  }, [selectedTemplate, defaultVariables, onSelectTemplate]);

  const loadTemplates = () => {
    const loadedTemplates = messageTemplateService.getTemplates();
    setTemplates(loadedTemplates);
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    const processedMessage = messageTemplateService.processTemplate(selectedTemplate, variables);
    onSelectTemplate(processedMessage, selectedTemplate.id);
    setIsOpen(false);
    toast.success('Template aplicado!');
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  const handleDeleteTemplate = (template: MessageTemplate) => {
    if (window.confirm(`Deseja excluir o template "${template.name}"?`)) {
      messageTemplateService.deleteTemplate(template.id);
      loadTemplates();
      toast.success('Template excluído!');
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'boas-vindas', label: 'Boas-vindas' },
    { value: 'seguimento', label: 'Seguimento' },
    { value: 'promocional', label: 'Promocional' },
    { value: 'suporte', label: 'Suporte' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  const getCategoryColor = (category: string) => {
    const colors = {
      'boas-vindas': 'bg-green-900 text-green-200',
      'seguimento': 'bg-blue-900 text-blue-200',
      'promocional': 'bg-purple-900 text-purple-200',
      'suporte': 'bg-orange-900 text-orange-200',
      'personalizado': 'bg-gray-900 text-gray-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-900 text-gray-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
          <FileText className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-blue-400 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Modelos de Mensagem
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Lista de Templates */}
          <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-sexy">
            {templates.map(template => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors border-gray-600 ${
                  selectedTemplate?.id === template.id
                    ? 'bg-blue-900/50 border-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-gray-200">{template.name}</h4>
                      <Badge className="text-xs mt-1 bg-green-900 text-green-200">
                        {template.category}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {template.content.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview e Variáveis */}
          {selectedTemplate && (
            <div className="border-t border-gray-600 pt-4">
              <h3 className="text-lg font-medium text-gray-200 mb-3">{selectedTemplate.name}</h3>
              
              {selectedTemplate.variables.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-sm text-gray-300">Preencha as variáveis:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.variables.map(variable => (
                      <div key={variable}>
                        <Input
                          value={variables[variable] || ''}
                          onChange={(e) => setVariables(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }))}
                          placeholder={variable.charAt(0).toUpperCase() + variable.slice(1)}
                          className="bg-gray-700 border-gray-600 text-gray-200 h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <Label className="text-sm text-gray-300 mb-2 block">Preview:</Label>
                <div className="bg-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-message">
                  <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">
                    {messageTemplateService.processTemplate(selectedTemplate, variables)}
                  </pre>
                </div>
              </div>

              <Button
                onClick={handleUseTemplate}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Usar este Template
              </Button>
            </div>
          )}

          {!selectedTemplate && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Selecione um template para visualizar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente do formulário de criação/edição
interface TemplateFormProps {
  template?: MessageTemplate | null;
  onSave: (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState<MessageTemplate['category']>(template?.category || 'personalizado');
  const [content, setContent] = useState(template?.content || '');

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    const variables = messageTemplateService.extractVariables(content);
    
    onSave({
      name: name.trim(),
      category,
      content: content.trim(),
      variables,
    });
  };

  const categories = [
    { value: 'boas-vindas', label: 'Boas-vindas' },
    { value: 'seguimento', label: 'Seguimento' },
    { value: 'promocional', label: 'Promocional' },
    { value: 'suporte', label: 'Suporte' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-200 mb-4">
        {template ? 'Editar Template' : 'Novo Template'}
      </h3>
      
      <div className="space-y-3 mb-4">
        <div>
          <Label className="text-sm text-gray-300">Nome:</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do template..."
            className="bg-gray-700 border-gray-600 text-gray-200"
          />
        </div>

        <div>
          <Label className="text-sm text-gray-300">Categoria:</Label>
          <Select value={category} onValueChange={(value: MessageTemplate['category']) => setCategory(value)}>
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 mb-4">
        <Label className="text-sm text-gray-300 mb-2 block">
          Conteúdo (use {'{variavel}'} para criar variáveis):
        </Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Olá {nome}! ..."
          className="bg-gray-700 border-gray-600 text-gray-200 h-full min-h-[200px] resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
          Salvar
        </Button>
      </div>
    </div>
  );
};

export default MessageTemplateSelector; 