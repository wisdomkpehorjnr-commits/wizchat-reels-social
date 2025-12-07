import { supabase } from '@/integrations/supabase/client';

export async function askWizAI(prompt: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('wizchat-ai', {
      body: { prompt }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    return data?.reply || "Sorry, I couldn't process that request.";
  } catch (err: any) {
    console.error('WizAI error:', err);
    throw new Error(err.message || 'Failed to get AI response');
  }
}

