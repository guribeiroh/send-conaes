import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Edit, Trash2, FileText, Save } from 'lucide-react';
import { messageTemplateService } from '@/services/messageTemplateService';
import type { MessageTemplate } from '@/types/messageTemplate';
import { toast } from 'sonner';

const MessageTemplateManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MessageTemplate['category']>('personalizado');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const loadedTemplates = messageTemplateService.getTemplates();
    setTemplates(loadedTemplates);
  };

  const resetForm = () => {
    setName('');
    setCategory('personalizado');
    setContent('');
    setSelectedTemplate(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    const variables = messageTemplateService.extractVariables(content);
    
    try {
      if (isEditing && selectedTemplate) {
        messageTemplateService.updateTemplate(selectedTemplate.id, {
          name: name.trim(),
          category,
          content: content.trim(),
          variables,
        });
        toast.success('Template atualizado!');
      } else {
        messageTemplateService.addTemplate({
          name: name.trim(),
          category,
          content: content.trim(),
          variables,
        });
        toast.success('Template criado!');
      }
      
      loadTemplates();
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar template');
    }
  };

  const categories = [
    { value: 'boas-vindas', label: 'Boas-vindas' },
    { value: 'seguimento', label: 'Seguimento' },
    { value: 'promocional', label: 'Promocional' },
    { value: 'suporte', label: 'Suporte' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-700">
          <Settings className="w-4 h-4 mr-2" />
          Gerenciar
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-blue-400 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerenciar Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[60vh]">
          <div className="w-1/2 pr-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300">Templates</h3>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-7"
              >
                <Plus className="w-3 h-3 mr-1" />
                Novo
              </Button>
            </div>

            <div className="overflow-y-auto space-y-2 h-full">
              {templates.map(template => (
                <Card
                  key={template.id}
                  className="cursor-pointer bg-gray-700 hover:bg-gray-600 border-gray-600"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setName(template.name);
                    setCategory(template.category);
                    setContent(template.content);
                    setIsCreating(false);
                    setIsEditing(true);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-200">{template.name}</h4>
                        <Badge className="text-xs mt-1 bg-green-900 text-green-200">
                          {categories.find(c => c.value === template.category)?.label}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {template.content.substring(0, 40)}...
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Excluir template?')) {
                            messageTemplateService.deleteTemplate(template.id);
                            loadTemplates();
                            toast.success('Template excluído!');
                          }
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="w-1/2 pl-4 border-l border-gray-600">
            {(isCreating || isEditing) ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-200">
                  {isEditing ? 'Editar Template' : 'Novo Template'}
                </h3>
                
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

                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">
                    Conteúdo (use {'{variavel}'} para variáveis):
                  </Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Olá {nome}! ..."
                    className="bg-gray-700 border-gray-600 text-gray-200 h-40 resize-none scrollbar-message"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={resetForm} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Selecione um template ou crie um novo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageTemplateManager; 