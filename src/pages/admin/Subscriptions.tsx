import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { useAdmin } from '@/hooks/useAdmin';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/useToast';
import { BarChart3, Users, DollarSign, TrendingUp } from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string;
  created_at: string;
  user: {
    email: string;
    user_metadata: {
      name: string;
    };
  };
}

interface Analytics {
  totalSubscribers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  growthRate: number;
}

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { success, error } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSubscribers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    growthRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (adminLoading) return;
    
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    loadSubscriptions();
    loadAnalytics();
  }, [isAdmin, adminLoading, navigate]);

  const loadSubscriptions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user:user_id (
            email,
            user_metadata
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: activeData } = await supabase
        .from('subscriptions')
        .select('plan', { count: 'exact' })
        .eq('status', 'active');

      const { data: revenueData } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('status', 'active')
        .gte('current_period_end', monthStart.toISOString());

      const revenue = (revenueData || []).reduce((acc, sub) => {
        const prices = { pro: 47, enterprise: 197 };
        return acc + (prices[sub.plan as 'pro' | 'enterprise'] || 0);
      }, 0);

      setAnalytics({
        totalSubscribers: subscriptions.length,
        activeSubscriptions: activeData?.length || 0,
        monthlyRevenue: revenue,
        growthRate: 0 // Implementar cálculo de crescimento
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (updateError) throw updateError;

      success('Status da assinatura atualizado');
      loadSubscriptions();
    } catch (err) {
      console.error('Error updating subscription:', err);
      error('Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Carregando assinaturas...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">Acesso negado. Apenas administradores podem acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Assinaturas</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total de Assinantes</h3>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{analytics.totalSubscribers}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Assinaturas Ativas</h3>
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{analytics.activeSubscriptions}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Receita Mensal</h3>
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              R$ {analytics.monthlyRevenue.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Taxa de Crescimento</h3>
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {analytics.growthRate}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Lista de Assinaturas</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Próxima Cobrança
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {subscription.user?.user_metadata?.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {subscription.user?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          subscription.plan === 'enterprise'
                            ? 'bg-purple-100 text-purple-800'
                            : subscription.plan === 'pro'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subscription.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : subscription.status === 'canceled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {subscription.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {subscription.status !== 'active' && (
                            <LoadingButton
                              onClick={() => handleStatusChange(subscription.id, 'active')}
                              loading={actionLoading}
                              className="text-xs"
                            >
                              Ativar
                            </LoadingButton>
                          )}
                          {subscription.status !== 'canceled' && (
                            <LoadingButton
                              onClick={() => handleStatusChange(subscription.id, 'canceled')}
                              loading={actionLoading}
                              variant="secondary"
                              className="text-xs"
                            >
                              Cancelar
                            </LoadingButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}