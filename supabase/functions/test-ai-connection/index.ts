import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const { provider } = await req.json();

    let testResponse;
    const testMessage = "Test connection message";

    switch (provider.type) {
      case 'openai':
        testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: testMessage }],
          }),
        });
        break;

      case 'anthropic':
        testResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: testMessage }],
          }),
        });
        break;

      case 'openrouter':
        testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model || 'openai/gpt-3.5-turbo',
            messages: [{ role: 'user', content: testMessage }],
          }),
        });
        break;

      case 'custom':
        if (!provider.baseUrl) {
          throw new Error('URL base é necessária para provedores personalizados');
        }
        testResponse = await fetch(provider.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: testMessage }],
          }),
        });
        break;

      default:
        throw new Error('Provedor de IA não suportado');
    }

    if (!testResponse.ok) {
      throw new Error(`Erro na conexão: ${testResponse.status}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao testar conexão com IA' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});