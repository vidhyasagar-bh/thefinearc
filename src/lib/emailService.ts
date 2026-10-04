export type EmailType =
  | 'commission_inquiry'
  | 'commission_accepted'
  | 'commission_declined';

export async function sendEmail(type: EmailType, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
  } catch {
    // Non-fatal — email failure never blocks the user action
  }
}
