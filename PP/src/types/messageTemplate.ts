export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'boas-vindas' | 'seguimento' | 'promocional' | 'suporte' | 'personalizado';
  variables: string[]; // Lista de variáveis como ['nome', 'empresa']
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  placeholder: string;
  required: boolean;
} 