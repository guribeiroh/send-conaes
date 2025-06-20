
export interface FormData {
  name: string;
  email: string;
  phone: string;
}

export interface WebhookPayload extends FormData {
  timestamp: string;
  source: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  msg?: string;
}

export interface WebhookError {
  message: string;
  status?: number;
  details?: any;
}
