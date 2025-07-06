import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

// Mapeamento de Price IDs para planos
const PRICE_TO_PLAN = {
  [Deno.env.get('STRIPE_PRO_PRICE_ID')!]: 'pro',
  [Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID')!]: 'enterprise',
};

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) {
    console.error('User not found for customer:', customerId);
    return null;
  }

  return data.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    if (!customerId || !subscriptionId) {
      throw new Error('Missing customer or subscription ID');
    }

    // Buscar usuário pelo stripe_customer_id
    const userId = await findUserByCustomerId(customerId);
    if (!userId) {
      throw new Error(`User not found for customer: ${customerId}`);
    }

    // Buscar detalhes da subscription no Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
      throw new Error('No price ID found in subscription');
    }

    // Criar/atualizar subscription no Supabase
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        id: subscriptionId,
        user_id: userId,
        status: subscription.status,
        price_id: priceId,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;

    console.log(`Subscription created/updated: ${subscriptionId} for user: ${userId}`);
  } catch (err) {
    console.error('Error handling checkout completed:', err);
    throw err;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    const userId = await findUserByCustomerId(customerId);
    
    if (!userId) {
      throw new Error(`User not found for customer: ${customerId}`);
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      throw new Error('No price ID found in subscription');
    }

    // Atualizar subscription
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        id: subscription.id,
        user_id: userId,
        status: subscription.status,
        price_id: priceId,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;

    console.log(`Subscription updated: ${subscription.id} for user: ${userId}`);
  } catch (err) {
    console.error('Error handling subscription updated:', err);
    throw err;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Marcar como cancelada (manter histórico)
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (error) throw error;

    console.log(`Subscription deleted: ${subscription.id}`);
  } catch (err) {
    console.error('Error handling subscription deleted:', err);
    throw err;
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    // Atualizar dados do customer no profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: customer.name,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customer.id);

    if (error) throw error;

    console.log(`Customer updated: ${customer.id}`);
  } catch (err) {
    console.error('Error handling customer updated:', err);
    throw err;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});