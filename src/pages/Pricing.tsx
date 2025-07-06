import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Rocket, Loader2 } from 'lucide-react';
import { useSession } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Para criadores iniciantes',
    icon: Zap,
    features: [
      '5 ideias por dia',
      'Dashboard básico',
      'Salvamento de ideias',
      'Suporte por email'
    ],
    action: 'Começar grátis',
    popular: false,
    planId: 'free'
  },
  {
    name: 'Pro',
    price: '47',
    description: 'Para criadores profissionais',
    icon: Crown,
    features: [
      'Ideias ilimitadas',
      'Analytics avançado',
      'Integração com redes sociais',
      'Suporte prioritário',
      'Exportação de relatórios',
      'Calendário editorial'
    ],
    action: 'Assinar Pro',
    popular: true,
    planId: 'pro'
  },
  {
    name: 'Enterprise',
    price: '197',
    description: 'Para agências e times',
    icon: Rocket,
    features: [
      'Tudo do plano Pro',
      'Multi-usuários',
      'API access',
      'White label',
      'Gerenciador de equipes',
      'Treinamento dedicado',
      'SLA garantido'
    ],
    action: 'Falar com vendas',
    popular: false,
    planId: 'enterprise'
  }
];

export default function Pricing() {
  const session = useSession();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlanSelection = async (planId: string) => {
    if (!session) {
      navigate('/register');
      return;
    }

    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    if (planId === 'enterprise') {
      window.open('mailto:vendas@neura.app?subject=Interesse no Plano Enterprise', '_blank');
      return;
    }

    setLoading(planId);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Sessão não encontrada');
      }

      // Chamar edge function para criar checkout session
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ plan: planId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar checkout');
      }

      const { checkout_url } = await response.json();

      // Redirecionar para Stripe Checkout
      window.location.href = checkout_url;

    } catch (err) {
      console.error('Error selecting plan:', err);
      error(err instanceof Error ? err.message : 'Erro ao processar pagamento');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para você
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Desbloqueie todo o potencial do NEURA com nossos planos flexíveis
            que se adaptam ao seu crescimento
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-xl p-8 ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                <plan.icon className="w-6 h-6 text-purple-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-4 text-gray-500">{plan.description}</p>

              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">
                  R${plan.price}
                </span>
                <span className="ml-1 text-2xl text-gray-500">/mês</span>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mt-1" />
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  onClick={() => handlePlanSelection(plan.planId)}
                  disabled={loading === plan.planId}
                  className={`w-full py-3 ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  {loading === plan.planId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    plan.action
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Perguntas frequentes
          </h2>
          <div className="max-w-3xl mx-auto mt-8 grid gap-6">
            <div className="bg-white rounded-lg p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                Posso trocar de plano depois?
              </h3>
              <p className="mt-2 text-gray-600">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
                As alterações serão refletidas na sua próxima fatura.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                Como funciona o período gratuito?
              </h3>
              <p className="mt-2 text-gray-600">
                Todos os planos pagos incluem 7 dias de teste grátis.
                Você só será cobrado após esse período e pode cancelar a qualquer momento.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                Preciso fornecer cartão de crédito?
              </h3>
              <p className="mt-2 text-gray-600">
                Não para o plano Free. Para os planos pagos, você só precisa fornecer
                os dados de pagamento após o período de teste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}