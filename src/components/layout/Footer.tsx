import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { InstagramIcon } from '../ui/Icons';
import toast from 'react-hot-toast';

export function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('newsletter_subscribers').insert({ email });
        if (error && error.code !== '23505') throw error;
      }
      toast.success('Welcome to the collection.');
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="bg-art-charcoal text-white/70">
      <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12">
          {/* Brand */}
          <div className="space-y-5">
            <p className="font-serif text-2xl font-light text-white tracking-wide">
              The Fine Arc
            </p>
            <p className="font-sans text-sm leading-relaxed text-white/50 max-w-xs">
              Original fine art, crafted with intention. Each piece is a singular object made to outlast the moment.
            </p>
            <div className="flex items-center gap-5 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-300"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href="mailto:hello@thefinearc.com"
                className="text-white/40 hover:text-white transition-colors duration-300"
              >
                <Mail size={18} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-5">
            <p className="font-sans text-[10px] tracking-widest uppercase text-white/40">
              Explore
            </p>
            <nav className="flex flex-col gap-3">
              {[
                { label: 'Gallery', href: '/gallery' },
                { label: 'About the Artist', href: '/about' },
                { label: 'Commissions', href: '/commissions' },
                { label: 'Contact', href: '/contact' },
              ].map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="font-sans text-sm text-white/50 hover:text-white transition-colors duration-300 w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-5">
            <p className="font-sans text-[10px] tracking-widest uppercase text-white/40">
              Stay close
            </p>
            <p className="font-sans text-sm leading-relaxed text-white/50">
              Be first to access new collections and exclusive releases.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-0 border-b border-white/20">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 bg-transparent text-white text-sm font-sans placeholder:text-white/25 focus:outline-none py-3 pr-4"
              />
              <button
                type="submit"
                disabled={submitting}
                className="font-sans text-[10px] tracking-widest uppercase text-white/50 hover:text-white transition-colors pb-3 disabled:opacity-40"
              >
                {submitting ? '...' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="font-sans text-[11px] text-white/25">
            © {new Date().getFullYear()} The Fine Arc. All rights reserved.
          </p>
          <Link to="/admin" className="font-sans text-[11px] text-white/40 hover:text-white transition-colors">
            Admin ↗
          </Link>
        </div>
      </div>
    </footer>
  );
}
