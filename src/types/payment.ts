export interface Payment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'credit_card' | 'pix' | 'boleto';
  last_four?: string;
  expiry_date?: string;
  is_default: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  payment_id?: string;
  user_id: string;
  amount: number;
  status: 'draft' | 'issued' | 'paid' | 'canceled';
  due_date: string;
  paid_at?: string;
  created_at: string;
}