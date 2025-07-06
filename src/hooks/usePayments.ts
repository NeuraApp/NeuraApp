import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod, Invoice } from '@/types/payment';

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const [
        { data: paymentsData },
        { data: methodsData },
        { data: invoicesData }
      ] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_methods').select('*'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false })
      ]);

      setPayments(paymentsData || []);
      setPaymentMethods(methodsData || []);
      setInvoices(invoicesData || []);
    } catch (err) {
      console.error('Error loading payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([method])
      .select()
      .single();

    if (error) throw error;
    setPaymentMethods(prev => [...prev, data]);
    return data;
  };

  const removePaymentMethod = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setPaymentMethods(prev => prev.filter(method => method.id !== id));
  };

  const setDefaultPaymentMethod = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
    
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .neq('id', id);

    loadPaymentData();
  };

  return {
    payments,
    paymentMethods,
    invoices,
    loading,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    refresh: loadPaymentData
  };
}