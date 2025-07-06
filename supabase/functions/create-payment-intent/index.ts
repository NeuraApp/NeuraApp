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

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

const PLAN_PRICES = {
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID')!,
  enterprise: Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID')!
};

async function getOrCreateCustomer(user: any): Promise<string> {
  // Verificar se já existe stripe_customer_id no profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Buscar customer existente no Stripe por email
  const existingCustomers = await stripe.customers.list({
    email: user.email,
    limit: 1
  });

  let customerId: string;

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    // Criar novo customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.nome || user.user_metadata?.name,
      metadata: {
        user_id: user.id
      }
    });
    customerId = customer.id;
  }

  // Salvar stripe_customer_id no profile
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', user.id);

  return customerId;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

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

    const { plan } = await req.json();
    
    if (!plan || !PLAN_PRICES[plan as keyof typeof PLAN_PRICES]) {
      throw new Error('Invalid plan specified');
    }

    const priceId = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];

    // Obter ou criar customer
    const customerId = await getOrCreateCustomer(user);

    // Criar checkout session em vez de payment intent
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard?success=true`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan
      },
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Invalid plan')) {
      statusCode = 400;
      errorMessage = 'Plano inválido';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});