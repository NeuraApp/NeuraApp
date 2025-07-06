import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabase';

interface UserSubscription {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface SubscriptionState {
  subscription: UserSubscription | null;
  loading: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  canUseFeature: (feature: string) => boolean;
}

const PRICE_TO_PLAN = {
  [import.meta.env.VITE_STRIPE_PRO_PRICE_ID]: 'pro',
  [import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise',
} as const;

export function useSubscription(): SubscriptionState {
  const session = useSession();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      if (!session?.user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        setSubscription(data);
      } catch (err) {
        console.error('Error loading subscription:', err);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${session?.user?.id}`
        },
        (payload) => {
          console.log('Subscription updated:', payload);
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as UserSubscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Calcular estado derivado
  const isActive = subscription?.status === 'active' && 
    new Date(subscription.current_period_end) > new Date();

  const plan = isActive && subscription?.price_id 
    ? (PRICE_TO_PLAN[subscription.price_id] || 'free')
    : 'free';

  const isPro = plan === 'pro';
  const isEnterprise = plan === 'enterprise';

  const canUseFeature = (feature: string): boolean => {
    if (!isActive) return false;

    switch (feature) {
      case 'unlimited_ideas':
        return isPro || isEnterprise;
      case 'advanced_analytics':
        return isPro || isEnterprise;
      case 'priority_support':
        return isPro || isEnterprise;
      case 'multi_users':
        return isEnterprise;
      case 'api_access':
        return isEnterprise;
      case 'white_label':
        return isEnterprise;
      default:
        return false;
    }
  };

  return {
    subscription,
    loading,
    plan,
    isActive,
    isPro,
    isEnterprise,
    canUseFeature
  };
}