import { useState } from 'react';
import { FadeIn } from '../ui/FadeIn';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('newsletter_subscribers').insert({ email });
        if (error && error.code !== '23505') throw error;
      }
      toast.success("Welcome. You'll hear from us soon.");
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-28 md:py-40 px-6 md:px-12 lg:px-20 bg-art-charcoal">
      <div className="max-w-8xl mx-auto">
        <FadeIn>
          <div className="max-w-xl mx-auto text-center space-y-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-white/40">
              The Inner Circle
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-white leading-tight">
              Be first to know.
            </h2>
            <p className="font-sans text-sm text-white/50 leading-relaxed">
              New collections, exclusive releases, and quiet moments from the studio — for those who want to collect with intention.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-0 max-w-sm mx-auto border-b border-white/20 mt-10">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="flex-1 bg-transparent text-white text-sm font-sans placeholder:text-white/25 focus:outline-none py-3 pr-4"
              />
              <button
                type="submit"
                disabled={submitting}
                className="font-sans text-[10px] tracking-widest uppercase text-white/50 hover:text-white transition-colors pb-3 disabled:opacity-40"
              >
                {submitting ? '...' : 'Subscribe'}
              </button>
            </form>
            <p className="font-sans text-[10px] text-white/25">
              No noise. Unsubscribe at any time.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
