import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { Loader2, CreditCard, Shield, ArrowLeft } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

function CheckoutForm({ clientSecret, plan }: { clientSecret: string; plan: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      error('Elemento do cartão não encontrado');
      setLoading(false);
      return;
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        success('Pagamento realizado com sucesso!');
        
        // Update user subscription status
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('subscriptions').upsert({
            user_id: session.user.id,
            plan,
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          }, {
            onConflict: 'user_id'
          });
        }

        navigate('/dashboard', { 
          state: { message: 'Assinatura ativada com sucesso!' }
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      error(err instanceof Error ? err.message : 'Erro no pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Informações do Cartão
        </h3>
        
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement options={cardElementOptions} />
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Shield className="w-4 h-4" />
          <span>Seus dados estão protegidos com criptografia SSL</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando pagamento...
          </>
        ) : (
          `Confirmar Pagamento - R$ ${plan === 'pro' ? '47,00' : '197,00'}`
        )}
      </button>
    </form>
  );
}

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientSecret, plan } = location.state || {};

  useEffect(() => {
    if (!clientSecret || !plan) {
      navigate('/pricing');
    }
  }, [clientSecret, plan, navigate]);

  if (!clientSecret || !plan) {
    return null;
  }

  const planDetails = {
    pro: {
      name: 'Pro',
      price: 'R$ 47,00',
      features: ['Ideias ilimitadas', 'Analytics avançado', 'Suporte prioritário']
    },
    enterprise: {
      name: 'Enterprise',
      price: 'R$ 197,00',
      features: ['Tudo do Pro', 'Multi-usuários', 'API access', 'White label']
    }
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos planos
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-purple-600 text-white p-6">
            <h1 className="text-2xl font-bold">Finalizar Assinatura</h1>
            <p className="text-purple-100 mt-2">
              Você está assinando o plano {currentPlan.name}
            </p>
          </div>

          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-gray-900 mb-2">
                Plano {currentPlan.name} - {currentPlan.price}/mês
              </h2>
              <ul className="text-sm text-gray-600 space-y-1">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Elements stripe={stripePromise}>
              <CheckoutForm clientSecret={clientSecret} plan={plan} />
            </Elements>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Ao confirmar o pagamento, você concorda com nossos{' '}
            <a href="/terms" className="text-purple-600 hover:underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="/privacy" className="text-purple-600 hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}