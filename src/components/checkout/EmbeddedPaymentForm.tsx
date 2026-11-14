import { useEffect } from 'react';

declare global {
  interface Window {
    // Loaded from https://js.stripe.com/dahlia/stripe.js (see index.html); Stripe ships no types for this API
    Stripe?: (publishableKey: string) => any;
  }
}

const appearance = {
  theme: 'stripe',
  labels: 'auto',
  inputs: 'spaced',
  variables: {
    borderRadius: '4px',
    colorBackground: '#ffffff',
    colorDanger: '#df1b41',
    colorPrimary: '#0570de',
    colorSuccess: '#00c853',
    colorText: '#30313d',
    fontFamily: 'default',
    fontSizeBase: '16px',
    spacingUnit: '4px',
  },
};

export function EmbeddedPaymentForm({ clientSecret, onError }: { clientSecret: string; onError: (message: string) => void }) {
  useEffect(() => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey || !window.Stripe) {
      onError('Payments are not available right now. Please try again later.');
      return;
    }

    let form: any;
    let cancelled = false;

    (async () => {
      try {
        const stripe = window.Stripe!(publishableKey);
        const checkout = stripe.initCheckoutFormSdk({ clientSecret: Promise.resolve(clientSecret), appearance });
        form = checkout.createForm({ layout: 'expanded' });
        form.mount('#checkout-form');

        const loadActionsResult = await checkout.loadActions();
        if (cancelled) return;
        if (loadActionsResult.type === 'success') {
          form.on('confirm', async (event: unknown) => {
            try {
              await loadActionsResult.actions.confirm({ formConfirmEvent: event });
            } catch (error) {
              console.error('Payment confirmation error:', error);
              onError('Your payment could not be completed. Please check your details and try again.');
            }
          });
        } else {
          onError('The payment form could not be loaded. Please refresh and try again.');
        }
      } catch (error) {
        console.error('Payment form error:', error);
        onError('The payment form could not be loaded. Please refresh and try again.');
      }
    })();

    return () => {
      cancelled = true;
      form?.unmount?.();
    };
  }, [clientSecret, onError]);

  return <div id="checkout-form" />;
}
