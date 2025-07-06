import { supabase } from '@/lib/supabase';

export async function logEvent(name: string, data?: object) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.group(`📊 Event: ${name}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Data:', data);
    console.groupEnd();

    await supabase.from('analytics').insert([{
      event: name,
      user_id: user.id,
      properties: data,
      timestamp: new Date().toISOString()
    }]);
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}