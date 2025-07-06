import { supabase } from '@/lib/supabase';

export async function logError(code: string, error: Error) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.group(`🚨 Error: ${code}`);
    console.error(error);
    console.groupEnd();

    if (user) {
      await supabase.from('logs').insert([{
        event: code,
        user_id: user.id,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }]);
    }
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}