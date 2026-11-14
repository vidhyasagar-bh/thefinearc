import { useEffect, useRef } from 'react';

export interface ShippingAddress {
  name: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Props {
  countries: string[];
  initial: ShippingAddress;
  // Called on every edit; null while the address is still incomplete
  onChange: (address: ShippingAddress | null) => void;
  // Called if Stripe's address field cannot load, so the page can show manual fields instead
  onUnavailable: () => void;
}

const appearance = {
  theme: 'flat',
  variables: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: '14px',
    colorText: '#2C2825',
    colorPrimary: '#2C2825',
    colorBackground: '#FDFCFA',
    colorDanger: '#c0392b',
    borderRadius: '0px',
  },
  rules: {
    '.Input': { border: 'none', borderBottom: '1px solid #d9d2c8', boxShadow: 'none', backgroundColor: 'transparent', padding: '12px 0' },
    '.Input:focus': { borderBottom: '1px solid #2C2825', boxShadow: 'none' },
    '.Label': { fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c8279' },
  },
};

// Stripe's Address Element: suggests full addresses as the customer types (powered by Google Places, no extra key needed)
export function AddressElementField({ countries, initial, onChange, onUnavailable }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initial);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key || !window.Stripe || !mountRef.current) { onUnavailable(); return; }
    let element: any;
    try {
      const stripe = window.Stripe(key);
      const elements = stripe.elements({
        appearance,
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap' }],
      });
      const start = initialRef.current;
      element = elements.create('address', {
        mode: 'shipping',
        allowedCountries: countries,
        fields: { phone: 'never' },
        autocomplete: { mode: 'automatic' },
        defaultValues: {
          name: start.name,
          address: { line1: start.street1, line2: start.street2, city: start.city, state: start.state, postal_code: start.zip, country: start.country },
        },
      });
      element.mount(mountRef.current);
      element.on('change', (event: any) => {
        const a = event.value?.address;
        if (!event.complete || !a) { onChangeRef.current(null); return; }
        onChangeRef.current({
          name: event.value.name ?? '',
          street1: a.line1 ?? '',
          street2: a.line2 ?? '',
          city: a.city ?? '',
          state: a.state ?? '',
          zip: a.postal_code ?? '',
          country: a.country ?? '',
        });
      });
    } catch (error) {
      console.error('Address field error:', error);
      onUnavailable();
    }
    return () => { element?.destroy?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} />;
}
