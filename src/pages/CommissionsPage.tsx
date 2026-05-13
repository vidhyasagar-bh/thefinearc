import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase, supabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  project_description: string;
  size_preferences: string;
  color_preferences: string;
}

const initialForm: FormData = {
  name: '',
  email: '',
  phone: '',
  project_description: '',
  size_preferences: '',
  color_preferences: '',
};

export function CommissionsPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.project_description || !form.size_preferences || !form.color_preferences) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('commission_inquiries').insert({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          project_description: form.project_description,
          budget: '',
          size_preferences: form.size_preferences || null,
          style_preferences: null,
          color_preferences: form.color_preferences || null,
          status: 'pending',
        });
        if (error) throw error;
      }
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="pt-32 md:pt-40 pb-20 md:pb-28 px-6 md:px-12 lg:px-20 bg-cream-100">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
          <FadeIn>
            <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
              Bespoke Work
            </p>
            <h1 className="font-serif text-5xl md:text-6xl font-light text-art-charcoal leading-tight">
              Commission a
              <br />
              <em>singular piece.</em>
            </h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="font-sans text-sm text-art-warm leading-relaxed max-w-md">
              A commissioned work is made entirely for you — responding to your space, your sensibility, and the feelings you want a painting to hold. It is a collaboration, and it takes time.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Process */}
      <section className="py-16 md:py-24 px-6 md:px-12 lg:px-20 bg-art-white border-b border-art-pale">
        <div className="max-w-8xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {[
              { step: '01', title: 'Enquire', desc: 'Share your vision, your space, and what you have in mind. No obligation at this stage.' },
              { step: '02', title: 'Discuss', desc: "We'll speak about the work — dimensions, mood, materials, timeline." },
              { step: '03', title: 'Create', desc: "The work is made slowly and with care. You'll receive updates along the way." },
              { step: '04', title: 'Deliver', desc: 'Carefully packed, with a certificate of authenticity and care instructions.' },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.1}>
                <div className="space-y-3">
                  <p className="font-sans text-[10px] tracking-widest text-art-muted">{item.step}</p>
                  <h3 className="font-serif text-xl font-light text-art-charcoal">{item.title}</h3>
                  <p className="font-sans text-sm text-art-muted leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-24 md:py-40 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-3xl mx-auto">
          {submitted ? (
            <FadeIn>
              <div className="text-center space-y-6 py-20">
                <div className="w-12 h-px bg-art-light mx-auto" />
                <h2 className="font-serif text-4xl font-light text-art-charcoal">
                  Thank you.
                </h2>
                <p className="font-sans text-sm text-art-muted leading-relaxed max-w-sm mx-auto">
                  Your enquiry has been received. I'll review it carefully and be in touch within a few days.
                </p>
              </div>
            </FadeIn>
          ) : (
            <>
              <FadeIn>
                <h2 className="font-serif text-3xl md:text-4xl font-light text-art-charcoal mb-12">
                  Tell me about your vision
                </h2>
              </FadeIn>

              <FadeIn delay={0.1}>
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="Your name *"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      required
                    />
                    <Input
                      label="Email address *"
                      type="email"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Phone (optional)"
                    type="tel"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                  />

                  <Textarea
                    label="Describe your vision *"
                    value={form.project_description}
                    onChange={e => update('project_description', e.target.value)}
                    rows={5}
                    placeholder="Tell me about the space, the feeling you're looking for, any subjects or references that inspire you..."
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="Preferred size *"
                      value={form.size_preferences}
                      onChange={e => update('size_preferences', e.target.value)}
                      placeholder="e.g. Large, around 80 × 100cm"
                      required
                    />
                    <Input
                      label="Colour palette *"
                      value={form.color_preferences}
                      onChange={e => update('color_preferences', e.target.value)}
                      placeholder="e.g. Warm, earthy, neutral"
                      required
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" size="lg" disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Enquiry'}
                    </Button>
                  </div>
                </form>
              </FadeIn>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
