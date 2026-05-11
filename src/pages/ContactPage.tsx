import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail } from 'lucide-react';
import { InstagramIcon } from '../components/ui/Icons';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL;

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!USE_MOCK) {
        const { error } = await supabase.from('contact_messages').insert({
          name: form.name,
          email: form.email,
          subject: form.subject || null,
          message: form.message,
        });
        if (error) throw error;
      }
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please email us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="pt-32 md:pt-40 pb-24 md:pb-40 px-6 md:px-12 lg:px-20">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32">
          {/* Left */}
          <FadeIn direction="left">
            <div className="space-y-10">
              <div>
                <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
                  Get in touch
                </p>
                <h1 className="font-serif text-5xl md:text-6xl font-light text-art-charcoal leading-tight">
                  Let's talk.
                </h1>
              </div>
              <p className="font-sans text-sm text-art-warm leading-relaxed max-w-sm">
                Whether you have a question about an available work, are interested in a commission, or simply want to say hello — I'd love to hear from you.
              </p>

              <div className="space-y-5 pt-4">
                <a
                  href="mailto:hello@thefinearc.com"
                  className="flex items-center gap-4 text-art-muted hover:text-art-charcoal transition-colors group"
                >
                  <Mail size={18} strokeWidth={1.5} />
                  <span className="font-sans text-sm group-hover:underline underline-offset-4">
                    hello@thefinearc.com
                  </span>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 text-art-muted hover:text-art-charcoal transition-colors group"
                >
                  <InstagramIcon size={18} />
                  <span className="font-sans text-sm group-hover:underline underline-offset-4">
                    @thefinearc
                  </span>
                </a>
              </div>

              <div className="pt-10">
                <div className="aspect-[4/3] overflow-hidden bg-cream-100">
                  <img
                    src="https://picsum.photos/seed/contact-studio/1000/750"
                    alt="Studio"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Form */}
          <FadeIn direction="right" delay={0.15}>
            {submitted ? (
              <div className="flex items-center justify-center h-full py-20">
                <div className="text-center space-y-5">
                  <div className="w-8 h-px bg-art-light mx-auto" />
                  <h2 className="font-serif text-3xl font-light text-art-charcoal">Thank you.</h2>
                  <p className="font-sans text-sm text-art-muted">I'll be in touch shortly.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-9">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input
                    label="Name *"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    required
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Subject"
                  value={form.subject}
                  onChange={e => update('subject', e.target.value)}
                />
                <Textarea
                  label="Message *"
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  rows={6}
                  required
                />
                <div className="pt-2">
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </form>
            )}
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
