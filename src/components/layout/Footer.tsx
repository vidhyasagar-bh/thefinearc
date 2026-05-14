import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { InstagramIcon } from '../ui/Icons';

export function Footer() {
  return (
    <footer className="bg-art-charcoal text-white/70">
      <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
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
                href="https://www.instagram.com/the.fine.arc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-300"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href="mailto:thefinearc@gmail.com"
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
