import type { MessageTemplate } from '@/types/messageTemplate';

class MessageTemplateService {
  private storageKey = 'whatsapp_templates';

  // Modelos pré-definidos
  private defaultTemplates: MessageTemplate[] = [
    {
      id: '1',
      name: 'Boas-vindas Conaes',
      category: 'boas-vindas',
      content: `Olá {nome}! 👋

Obrigado por se cadastrar no Conaes! 

🎯 Estamos muito felizes em tê-lo(a) conosco.

Nossa equipe entrará em contato em breve para apresentar nossas soluções e como podemos ajudá-lo(a) a alcançar seus objetivos.

Se tiver alguma dúvida, fique à vontade para responder esta mensagem.

Bem-vindo(a) à família Conaes! 🚀`,
      variables: ['nome'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Seguimento Comercial',
      category: 'seguimento',
      content: `Olá {nome}!

Espero que esteja bem! 😊

Gostaria de saber se teve a oportunidade de analisar nossa proposta sobre {assunto}.

Caso tenha alguma dúvida ou precise de mais informações, estou à disposição para ajudar!

Aguardo seu retorno.

Atenciosamente,
Equipe Conaes`,
      variables: ['nome', 'assunto'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Oferta Especial',
      category: 'promocional',
      content: `🎉 Oferta Especial para {nome}!

Temos uma oportunidade única para {empresa}!

✅ {beneficio1}
✅ {beneficio2}
✅ {beneficio3}

💰 Condições especiais até {prazo}

Quer saber mais? Responda esta mensagem!

Equipe Conaes`,
      variables: ['nome', 'empresa', 'beneficio1', 'beneficio2', 'beneficio3', 'prazo'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Suporte Técnico',
      category: 'suporte',
      content: `Olá {nome}!

Recebemos sua solicitação sobre {problema}.

Nossa equipe técnica já está analisando e retornaremos em breve com a solução.

Tempo estimado: {tempo_estimado}

Em caso de urgência, entre em contato pelo telefone: {telefone_suporte}

Obrigado pela confiança!
Suporte Conaes`,
      variables: ['nome', 'problema', 'tempo_estimado', 'telefone_suporte'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  // Carregar templates do localStorage
  getTemplates(): MessageTemplate[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
      // Se não há templates salvos, usar os padrões
      this.saveTemplates(this.defaultTemplates);
      return this.defaultTemplates;
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      return this.defaultTemplates;
    }
  }

  // Salvar templates no localStorage
  private saveTemplates(templates: MessageTemplate[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Erro ao salvar templates:', error);
    }
  }

  // Adicionar novo template
  addTemplate(template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>): MessageTemplate {
    const newTemplate: MessageTemplate = {
      ...template,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const templates = this.getTemplates();
    templates.push(newTemplate);
    this.saveTemplates(templates);
    
    return newTemplate;
  }

  // Atualizar template
  updateTemplate(id: string, updates: Partial<MessageTemplate>): MessageTemplate | null {
    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return null;

    templates[index] = {
      ...templates[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.saveTemplates(templates);
    return templates[index];
  }

  // Deletar template
  deleteTemplate(id: string): boolean {
    const templates = this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) return false;
    
    this.saveTemplates(filtered);
    return true;
  }

  // Processar template com variáveis
  processTemplate(template: MessageTemplate, variables: Record<string, string>): string {
    let processedContent = template.content;
    
    // Substituir variáveis no formato {variavel}
    template.variables.forEach(variable => {
      const value = variables[variable] || `{${variable}}`;
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  }

  // Extrair variáveis do conteúdo
  extractVariables(content: string): string[] {
    const matches = content.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(match => match.slice(1, -1)))];
  }

  // Obter templates por categoria
  getTemplatesByCategory(category: MessageTemplate['category']): MessageTemplate[] {
    return this.getTemplates().filter(t => t.category === category);
  }
}

export const messageTemplateService = new MessageTemplateService(); 