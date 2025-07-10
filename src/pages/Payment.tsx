import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'; // COMENTADO
// import { loadStripe } from '@stripe/stripe-js'; // COMENTADO
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { Loader2, CreditCard, Shield, ArrowLeft, Construction } from 'lucide-react';

// A LINHA ABAIXO ESTAVA CAUSANDO O ERRO. FOI DESATIVADA TEMPORARIAMENTE.
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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

// O formulário de checkout foi temporariamente comentado pois depende do Stripe.
/*
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
*/

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientSecret, plan } = location.state || {};

  useEffect(() => {
    if (!clientSecret || !plan) {
      // navigate('/pricing'); // Comentado para não redirecionar durante o desenvolvimento
    }
  }, [clientSecret, plan, navigate]);

  // A LÓGICA DO STRIPE FOI DESATIVADA. EXIBIMOS UM PLACEHOLDER.
  // QUANDO VOCÊ TIVER SUAS CHAVES, BASTA DESCOMENTAR O CÓDIGO.
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
              Módulo de pagamento em configuração.
            </p>
          </div>

          <div className="p-8 text-center">
            <Construction className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Página em Manutenção</h2>
            <p className="text-gray-600 mt-2">
              O sistema de pagamentos está sendo configurado.
              Esta página estará funcional assim que as chaves da API do Stripe forem adicionadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
