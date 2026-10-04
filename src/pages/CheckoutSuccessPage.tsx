import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useCartStore } from '../store/cartStore';

export function CheckoutSuccessPage() {
  const clearCart = useCartStore(s => s.clearCart);
  useEffect(() => { clearCart(); }, [clearCart]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-6">
        <FadeIn>
          <div className="max-w-md mx-auto text-center space-y-7">
            <CheckCircle size={40} strokeWidth={1} className="text-art-warm mx-auto" />
            <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal">Order confirmed.</h1>
            <p className="font-sans text-sm text-art-muted leading-relaxed">
              Thank you for collecting. A receipt and confirmation are on their way to your email. Your work will be carefully packed and dispatched within 5–7 working days.
            </p>
            <div className="w-8 h-px bg-art-light mx-auto" />
            <Link to="/gallery"><Button variant="secondary" size="lg">Continue Browsing</Button></Link>
          </div>
        </FadeIn>
      </div>
    </Layout>
  );
}
