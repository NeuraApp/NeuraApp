export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  role: 'admin' | 'user';
}

export interface IdeaData {
  id: string;
  title: string;
  description: string;
  user_id: string;
  created_at: string;
  status: 'draft' | 'published';
}

export interface ToastConfig {
  position?: 'top-right' | 'bottom-center';
  defaultDuration?: number;
}

export interface ErrorLog {
  code: string;
  message: string;
  timestamp: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string;
}

export interface AIProvider {
  type: 'openai' | 'anthropic' | 'openrouter' | 'custom';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface AIPreferences {
  provider: AIProvider;
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}