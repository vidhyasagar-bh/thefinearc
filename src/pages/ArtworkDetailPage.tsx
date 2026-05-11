import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useArtwork, useArtworks } from '../hooks/useArtworks';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';

export function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { artwork, loading } = useArtwork(id || '');
  const { artworks: related } = useArtworks();
  const addItem = useCartStore(s => s.addItem);

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (loading) return <PageLoader />;
  if (!artwork) return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-serif text-2xl font-light text-art-muted">Artwork not found</p>
      </div>
    </Layout>
  );

  const relatedWorks = related
    .filter(a => a.id !== artwork.id && a.category === artwork.category)
    .slice(0, 3);

  function handleAddToCart() {
    if (artwork!.availability !== 'available') return;
    addItem(artwork!);
    toast.success(`"${artwork!.title}" added to your collection.`);
  }

  return (
    <Layout>
      <div className="pt-20 md:pt-32">
        {/* Breadcrumb */}
        <div className="px-6 md:px-12 lg:px-20 mb-6 md:mb-10">
          <div className="max-w-8xl mx-auto">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors"
            >
              <ChevronLeft size={12} /> Gallery
            </Link>
          </div>
        </div>

        {/* Main */}
        <div className="px-6 md:px-12 lg:px-20 pb-16 md:pb-40">
          <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20">
            {/* Images */}
            <FadeIn direction="left">
              <div className="space-y-3">
                {/* Main image */}
                <div
                  className="relative aspect-[3/4] overflow-hidden bg-cream-100 cursor-zoom-in group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={artwork.images[activeImage]}
                    alt={artwork.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-art-white/90 p-2">
                      <ZoomIn size={16} className="text-art-charcoal" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                {/* Thumbnails */}
                {artwork.images.length > 1 && (
                  <div className="flex gap-3">
                    {artwork.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`flex-1 aspect-[3/2] overflow-hidden border-2 transition-colors ${
                          activeImage === i ? 'border-art-charcoal' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Details */}
            <FadeIn direction="right" delay={0.2}>
              <div className="space-y-6 md:space-y-8 lg:sticky lg:top-32 lg:self-start">
                {/* Category */}
                <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                  {artwork.category.replace('-', ' ')} · {artwork.year}
                </p>

                {/* Title */}
                <h1 className="font-serif text-3xl md:text-5xl font-light text-art-charcoal leading-tight">
                  {artwork.title}
                </h1>

                {/* Price */}
                <div className="flex items-center gap-4">
                  {artwork.availability === 'available' ? (
                    <p className="font-sans text-2xl text-art-charcoal">
                      {formatPrice(artwork.price)}
                    </p>
                  ) : (
                    <p className="font-sans text-lg text-art-muted uppercase tracking-widest text-sm">
                      {artwork.availability === 'sold' ? 'Sold' : 'Reserved'}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="w-12 h-px bg-art-light" />

                {/* Story */}
                {artwork.story && (
                  <p className="font-serif text-lg font-light text-art-warm leading-relaxed italic">
                    "{artwork.story}"
                  </p>
                )}

                <p className="font-sans text-sm text-art-muted leading-relaxed">
                  {artwork.description}
                </p>

                {/* Specs */}
                <div className="space-y-3 border-t border-art-pale pt-6">
                  {[
                    { label: 'Materials', value: artwork.materials },
                    { label: 'Dimensions', value: artwork.dimensions },
                    artwork.framing && { label: 'Framing', value: artwork.framing },
                  ].filter(Boolean).map((spec: any) => (
                    <div key={spec.label} className="flex justify-between gap-4">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                        {spec.label}
                      </span>
                      <span className="font-sans text-sm text-art-charcoal text-right">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="pt-2">
                  {artwork.availability === 'available' ? (
                    <Button
                      onClick={handleAddToCart}
                      size="lg"
                      className="w-full"
                    >
                      <ShoppingBag size={16} strokeWidth={1.5} />
                      Add to Collection
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="font-sans text-sm text-art-muted">
                        This work is no longer available.
                      </p>
                      <Link to="/commissions">
                        <Button variant="secondary" size="lg" className="w-full">
                          Enquire about a Commission
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Shipping note */}
                <p className="font-sans text-[11px] text-art-muted leading-relaxed border-t border-art-pale pt-5">
                  All works are carefully packed and shipped with a certificate of authenticity. International shipping available. Contact us for custom framing quotes.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Related works */}
        {relatedWorks.length > 0 && (
          <div className="py-20 md:py-28 px-6 md:px-12 lg:px-20 bg-cream-100">
            <div className="max-w-8xl mx-auto">
              <FadeIn>
                <h2 className="font-serif text-3xl md:text-4xl font-light text-art-charcoal mb-14">
                  You may also like
                </h2>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                {relatedWorks.map((a, i) => (
                  <FadeIn key={a.id} delay={i * 0.1}>
                    <ArtworkCard artwork={a} index={i} />
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-6 right-6 text-white/60 hover:text-white"
              onClick={() => setLightboxOpen(false)}
            >
              <X size={24} strokeWidth={1.5} />
            </button>

            {artwork.images.length > 1 && (
              <>
                <button
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i => Math.max(0, i - 1)); }}
                >
                  <ChevronLeft size={32} strokeWidth={1.5} />
                </button>
                <button
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i => Math.min(artwork.images.length - 1, i + 1)); }}
                >
                  <ChevronRight size={32} strokeWidth={1.5} />
                </button>
              </>
            )}

            <motion.img
              key={activeImage}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={artwork.images[activeImage]}
              alt={artwork.title}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
