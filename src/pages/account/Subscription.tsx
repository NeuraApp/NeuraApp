import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useSubscription } from '@/hooks/useSubscription';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/useToast';
import { CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function AccountSubscription() {
  const navigate = useNavigate();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    try {
      // Aqui você implementará a integração com o gateway de pagamento
      success('Redirecionando para checkout...');
    } catch (err) {
      console.error('Error upgrading plan:', err);
      error('Erro ao atualizar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      // Implementar cancelamento
      success('Assinatura cancelada com sucesso');
    } catch (err) {
      console.error('Error canceling subscription:', err);
      error('Erro ao cancelar assinatura');
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Carregando informações da assinatura...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Minha Assinatura</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Plano {subscription?.plan.toUpperCase()}
              </h2>
              <p className="text-sm text-gray-600">
                Status: {subscription?.status === 'active' ? 'Ativo' : 'Inativo'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscription?.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {subscription?.status === 'active' ? 'ATIVO' : 'INATIVO'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Clock className="w-5 h-5" />
              <span>
                Próxima cobrança em:{' '}
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CreditCard className="w-5 h-5" />
              <span>Método de pagamento: •••• 4242</span>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Recursos do seu plano
            </h3>

            <div className="space-y-3">
              {subscription?.plan === 'free' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>5 ideias por dia</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Dashboard básico</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Analytics avançado (Pro)</span>
                  </div>
                </>
              )}

              {subscription?.plan === 'pro' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Ideias ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Analytics avançado</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Suporte prioritário</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            {subscription?.plan === 'free' && (
              <LoadingButton
                onClick={() => handleUpgrade('pro')}
                loading={loading}
                className="w-full"
              >
                Fazer Upgrade para Pro
              </LoadingButton>
            )}

            {subscription?.status === 'active' && subscription?.plan !== 'free' && (
              <LoadingButton
                onClick={handleCancel}
                loading={loading}
                variant="secondary"
                className="w-full"
              >
                Cancelar Assinatura
              </LoadingButton>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Histórico de Pagamentos
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fatura
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    01/05/2025
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ 47,00
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      PAGO
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                    <button className="hover:underline">Download</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}