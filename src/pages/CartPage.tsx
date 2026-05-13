import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/format';

export function CartPage() {
  const { items, removeItem, total } = useCartStore();
  const cartTotal = total();

  return (
    <Layout>
      <div className="pt-32 md:pt-40 pb-24 md:pb-40 px-6 md:px-12 lg:px-20 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
              Your Selection
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal mb-10 md:mb-14">
              Collection
            </h1>
          </FadeIn>

          {items.length === 0 ? (
            <FadeIn>
              <div className="py-24 text-center space-y-6">
                <p className="font-serif text-2xl font-light text-art-muted">
                  Your collection is empty.
                </p>
                <Link to="/gallery">
                  <Button variant="secondary" size="lg" className="mt-4">
                    Browse the Gallery
                  </Button>
                </Link>
              </div>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-16">
              {/* Items */}
              <div className="md:col-span-2 divide-y divide-art-pale">
                <AnimatePresence initial={false}>
                  {items.map(({ artwork }) => (
                    <motion.div
                      key={artwork.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="py-6 md:py-7"
                    >
                      <div className="flex gap-5 md:gap-6">
                        {/* Image */}
                        <Link to={`/artwork/${artwork.id}`} className="shrink-0">
                          <div className="w-20 h-20 md:w-28 md:h-28 overflow-hidden bg-cream-100">
                            <img
                              src={artwork.images[0]}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <Link to={`/artwork/${artwork.id}`}>
                                <h3 className="font-serif text-lg md:text-xl font-light text-art-charcoal hover:text-art-warm transition-colors leading-snug">
                                  {artwork.title}
                                </h3>
                              </Link>
                              <p className="font-sans text-xs text-art-muted mt-1 truncate">
                                {artwork.materials} · {artwork.dimensions}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(artwork.id)}
                              aria-label="Remove"
                              className="text-art-light hover:text-art-muted transition-colors shrink-0 p-1 -mr-1"
                            >
                              <X size={15} strokeWidth={1.5} />
                            </button>
                          </div>

                          <p className="font-sans text-base text-art-charcoal mt-3">
                            {formatPrice(artwork.price)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Summary */}
              <FadeIn delay={0.2}>
                <div className="md:sticky md:top-32 space-y-5 bg-cream-50 p-6 md:p-8">
                  <h2 className="font-serif text-xl font-light text-art-charcoal">
                    Order Summary
                  </h2>
                  <div className="space-y-3">
                    {items.map(({ artwork }) => (
                      <div key={artwork.id} className="flex justify-between text-sm gap-4">
                        <span className="font-sans text-art-muted truncate">
                          {artwork.title}
                        </span>
                        <span className="font-sans text-art-charcoal shrink-0">
                          {formatPrice(artwork.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-art-pale pt-4 flex justify-between">
                    <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      Total
                    </span>
                    <span className="font-sans text-lg text-art-charcoal">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-art-muted leading-relaxed">
                    Shipping calculated at checkout. International shipping available.
                  </p>
                  <Link to="/checkout" className="block">
                    <Button size="lg" className="w-full">
                      Proceed to Checkout
                    </Button>
                  </Link>
                  <Link to="/gallery" className="block text-center">
                    <span className="font-sans text-[11px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors">
                      Continue Browsing
                    </span>
                  </Link>
                </div>
              </FadeIn>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
