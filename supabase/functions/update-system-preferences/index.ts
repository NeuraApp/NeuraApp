import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Verificar se é admin usando a função do banco
    const { data: adminCheck, error: adminError } = await supabase
      .rpc('is_admin');

    if (adminError) {
      console.error('Error checking admin status:', adminError);
      throw new Error('Unauthorized: Cannot verify admin status');
    }

    if (!adminCheck) {
      throw new Error('Forbidden: Admin access required');
    }

    // Obter dados da requisição
    const { system_prompt, llm_provider } = await req.json();

    if (!system_prompt || typeof system_prompt !== 'string') {
      throw new Error('Invalid system_prompt provided');
    }

    // Atualizar configurações do sistema
    const { error: updateError } = await supabase
      .from('system_preferences')
      .update({
        system_prompt: system_prompt.trim(),
        llm_provider: llm_provider || 'gemini-pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global_config');

    if (updateError) {
      throw new Error(`Failed to update system preferences: ${updateError.message}`);
    }

    // Log da operação
    await supabase.from('logs').insert({
      event: 'system_preferences_updated',
      user_id: user.id,
      success: true,
      metadata: {
        llm_provider: llm_provider || 'gemini-pro',
        prompt_length: system_prompt.length
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Configurações do sistema atualizadas com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating system preferences:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Não autorizado';
    } else if (error.message.includes('Forbidden')) {
      statusCode = 403;
      errorMessage = 'Acesso negado - Apenas administradores';
    } else if (error.message.includes('Invalid')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Method not allowed')) {
      statusCode = 405;
      errorMessage = 'Método não permitido';
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