import { AIProvider, AIResponse, RateLimitInfo } from '@/types';

const RATE_LIMIT_KEY = 'neura_rate_limit';

export class RateLimitError extends Error {
  resetTime: Date;
  
  constructor(resetTime: Date) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

export async function checkRateLimit(): Promise<RateLimitInfo> {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const limit = stored ? JSON.parse(stored) : { count: 0, reset: now + 60000, total: 10 };
  
  if (now > limit.reset) {
    limit.count = 0;
    limit.reset = now + 60000;
  }
  
  if (limit.count >= limit.total) {
    throw new RateLimitError(new Date(limit.reset));
  }
  
  limit.count++;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limit));
  
  return {
    remaining: limit.total - limit.count,
    reset: limit.reset,
    total: limit.total
  };
}

export async function callAIProvider(provider: AIProvider, prompt: string): Promise<AIResponse> {
  try {
    await checkRateLimit();
    
    let response;
    
    switch (provider.type) {
      case 'openai':
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        break;
        
      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        break;
        
      case 'openrouter':
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'openai/gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        break;
        
      case 'custom':
        if (!provider.baseUrl) {
          throw new Error('URL base é necessária para provedores personalizados');
        }
        response = await fetch(provider.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        break;
        
      default:
        throw new Error('Provedor de IA não suportado');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Erro ${response.status} ao chamar IA`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta da IA inválida ou vazia');
    }

    return { success: true, content };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao chamar IA'
    };
  }
}