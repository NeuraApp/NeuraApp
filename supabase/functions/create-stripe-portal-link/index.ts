import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://luxury-crepe-10dd8a.netlify.app';

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

async function getStripeCustomerId(userId: string): Promise<string> {
  // Buscar stripe_customer_id na tabela profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Perfil do usuário não encontrado');
  }

  if (!profile?.stripe_customer_id) {
    throw new Error('Customer ID do Stripe não encontrado. Faça uma compra primeiro.');
  }

  return profile.stripe_customer_id;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: Missing authorization header');
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    console.log(`Creating Stripe portal session for user: ${user.id}`);

    // Obter stripe_customer_id do usuário
    const stripeCustomerId = await getStripeCustomerId(user.id);

    console.log(`Found Stripe customer ID: ${stripeCustomerId}`);

    // Criar sessão do portal de cobrança
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/minha-conta?tab=assinatura`,
    });

    console.log(`Portal session created: ${portalSession.id}`);

    // Log da operação
    await supabase.from('logs').insert({
      event: 'stripe_portal_accessed',
      user_id: user.id,
      success: true,
      metadata: {
        stripe_customer_id: stripeCustomerId,
        portal_session_id: portalSession.id
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        portal_url: portalSession.url,
        session_id: portalSession.id
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error creating Stripe portal session:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Method not allowed')) {
      statusCode = 405;
      errorMessage = 'Método não permitido';
    } else if (error.message.includes('não encontrado')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Customer ID do Stripe')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    // Log do erro
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          await supabase.from('logs').insert({
            event: 'stripe_portal_failed',
            user_id: user.id,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: statusCode === 500 ? undefined : error.message
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});