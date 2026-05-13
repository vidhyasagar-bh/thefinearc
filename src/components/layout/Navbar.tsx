import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { cn } from '../../utils/format';

const navLinks = [
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Commissions', href: '/commissions' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const itemCount = useCartStore(s => s.itemCount());
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isTransparent = isHome && !scrolled && !mobileOpen;

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-600',
          isTransparent
            ? 'bg-transparent'
            : 'bg-art-white/95 backdrop-blur-sm border-b border-art-pale'
        )}
      >
        <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              to="/"
              className={cn(
                'font-serif text-lg md:text-xl font-light tracking-widest transition-colors duration-300',
                isTransparent ? 'text-art-white' : 'text-art-charcoal'
              )}
            >
              The Fine Arc
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-10">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'font-sans text-[11px] tracking-widest uppercase transition-all duration-300 relative group',
                    isTransparent ? 'text-art-white/80 hover:text-art-white' : 'text-art-muted hover:text-art-charcoal'
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full transition-all duration-400',
                      isTransparent ? 'bg-art-white' : 'bg-art-charcoal'
                    )}
                  />
                </Link>
              ))}
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-5">
              <Link
                to="/cart"
                className={cn(
                  'relative transition-colors duration-300',
                  isTransparent ? 'text-art-white/80 hover:text-art-white' : 'text-art-muted hover:text-art-charcoal'
                )}
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-art-charcoal text-art-white text-[9px] rounded-full flex items-center justify-center font-sans">
                    {itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cn(
                  'md:hidden transition-colors duration-300',
                  isTransparent ? 'text-art-white' : 'text-art-charcoal'
                )}
              >
                {mobileOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-art-white flex flex-col items-center justify-center"
          >
            <nav className="flex flex-col items-center gap-10">
              <Link
                to="/"
                className="font-serif text-3xl font-light text-art-charcoal"
              >
                The Fine Arc
              </Link>
              <div className="flex flex-col items-center gap-7 mt-4">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="font-sans text-sm tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
