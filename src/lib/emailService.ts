import { supabase, supabaseConfigured } from './supabase';

export type EmailType =
  | 'commission_inquiry'
  | 'commission_accepted'
  | 'commission_declined'
  | 'order_confirmation';

export async function sendEmail(type: EmailType, data: Record<string, unknown>): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    await supabase.functions.invoke('send-email', { body: { type, data } });
  } catch {
    // Non-fatal — email failure never blocks the user action
  }
}
