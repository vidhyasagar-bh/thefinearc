import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ChevronLeft, ChevronRight, ShoppingBag, Play } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useArtwork, useArtworks } from '../hooks/useArtworks';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';
import type { ArtworkVariation } from '../types';

export function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { artwork, loading } = useArtwork(id || '');
  const { artworks: related } = useArtworks();
  const addItem = useCartStore(s => s.addItem);

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});

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

  const variations = artwork.variations ?? [];
  const propertyNames = Array.from(new Set(variations.flatMap(v => v.options.map(o => o.name))));
  const hasVariations = variations.length > 0;
  const chosen: ArtworkVariation | undefined = hasVariations && propertyNames.every(n => selected[n])
    ? variations.find(v => propertyNames.every(n => v.options.find(o => o.name === n)?.value === selected[n]))
    : undefined;
  const displayPrice = chosen ? chosen.price : artwork.price;
  const stock = chosen ? chosen.quantity : artwork.quantity;
  const hasVideo = Boolean(artwork.video_url);
  const videoIndex = artwork.images.length;
  const showingVideo = hasVideo && activeImage === videoIndex;
  const extras = artwork.etsy_data;
  const processing = extras?.processing_min != null && extras?.processing_max != null
    ? `${extras.processing_min}–${extras.processing_max} ${extras.processing_unit ?? 'business days'}`.replace(/(\d+)–\1/, '$1')
    : extras?.shipping?.min_processing_days != null
      ? `${extras.shipping.min_processing_days}–${extras.shipping.max_processing_days} business days`
      : null;

  function optionAvailable(name: string, value: string) {
    return variations.some(v =>
      v.quantity > 0 &&
      v.options.some(o => o.name === name && o.value === value) &&
      Object.entries(selected).every(([n, val]) => n === name || v.options.find(o => o.name === n)?.value === val)
    );
  }

  function handleAddToCart() {
    if (artwork!.availability !== 'available') return;
    if (hasVariations && !chosen) { toast.error(`Please select ${propertyNames.join(' and ')}.`); return; }
    if (chosen && chosen.quantity < 1) { toast.error('That option is sold out.'); return; }
    addItem(artwork!, chosen);
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
          <div className="max-w-8xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-20">
            {/* Images */}
            <FadeIn direction="left">
              <div className="space-y-3">
                {/* Main image */}
                {showingVideo ? (
                  <div className="relative aspect-[3/4] overflow-hidden bg-black">
                    <video
                      key={artwork.video_url}
                      src={artwork.video_url}
                      poster={artwork.images[0]}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
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
                )}

                {/* Thumbnails */}
                {(artwork.images.length > 1 || hasVideo) && (
                  <div className="flex gap-3 flex-wrap">
                    {artwork.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`flex-1 min-w-[60px] aspect-[3/2] overflow-hidden border-2 transition-colors ${
                          activeImage === i ? 'border-art-charcoal' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {hasVideo && (
                      <button
                        onClick={() => setActiveImage(videoIndex)}
                        aria-label="Play video"
                        className={`relative flex-1 min-w-[60px] aspect-[3/2] overflow-hidden border-2 transition-colors bg-art-charcoal ${
                          showingVideo ? 'border-art-charcoal' : 'border-transparent'
                        }`}
                      >
                        <img src={artwork.images[0]} alt="" className="w-full h-full object-cover opacity-60" />
                        <span className="absolute inset-0 flex items-center justify-center text-white">
                          <Play size={20} strokeWidth={1.5} fill="currentColor" />
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Details */}
            <FadeIn direction="right" delay={0.2}>
              <div className="space-y-6 md:space-y-8 md:sticky md:top-32 md:self-start">
                {/* Category */}
                <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                  {[artwork.category.replace('-', ' '), artwork.year].filter(Boolean).join(' · ')}
                </p>

                {/* Title */}
                <h1 className="font-serif text-3xl md:text-5xl font-light text-art-charcoal leading-tight">
                  {artwork.title}
                </h1>

                {/* Price */}
                <div className="flex items-center gap-4">
                  {artwork.availability === 'available' ? (
                    <p className="font-sans text-2xl text-art-charcoal">
                      {hasVariations && !chosen && variations.length > 1 ? 'From ' : ''}{formatPrice(displayPrice)}
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

                <p className="font-sans text-sm text-art-muted leading-relaxed whitespace-pre-line">
                  {artwork.description}
                </p>

                {/* Variations */}
                {hasVariations && artwork.availability === 'available' && (
                  <div className="space-y-5 border-t border-art-pale pt-6">
                    {propertyNames.map(name => {
                      const values = Array.from(new Set(
                        variations.map(v => v.options.find(o => o.name === name)?.value).filter(Boolean) as string[]
                      ));
                      return (
                        <div key={name}>
                          <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-2">{name}</p>
                          <div className="flex flex-wrap gap-2">
                            {values.map(value => {
                              const active = selected[name] === value;
                              const available = optionAvailable(name, value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setSelected(prev => ({ ...prev, [name]: active ? '' : value }))}
                                  className={`font-sans text-xs px-4 py-2 border transition-colors ${
                                    active
                                      ? 'border-art-charcoal bg-art-charcoal text-art-white'
                                      : available
                                        ? 'border-art-light text-art-charcoal hover:border-art-charcoal'
                                        : 'border-art-pale text-art-light line-through'
                                  }`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {artwork.availability === 'available' && stock != null && (!hasVariations || chosen) && (
                  <p className="font-sans text-xs text-art-muted">
                    {stock < 1 ? 'Sold out' : stock === 1 ? 'Only 1 available' : stock <= 5 ? `Only ${stock} available` : 'In stock'}
                  </p>
                )}

                {/* Specs */}
                <div className="space-y-3 border-t border-art-pale pt-6">
                  {[
                    { label: 'Materials', value: artwork.materials },
                    { label: 'Dimensions', value: artwork.dimensions },
                    artwork.framing && { label: 'Framing', value: artwork.framing },
                    extras?.who_made && { label: 'Made by', value: extras.who_made.replace(/_/g, ' ') },
                    processing && { label: 'Processing time', value: processing },
                    extras?.shipping?.origin_country_iso && { label: 'Ships from', value: extras.shipping.origin_country_iso },
                  ].filter((spec: any) => spec && spec.value).map((spec: any) => (
                    <div key={spec.label} className="flex justify-between gap-4 flex-wrap">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted shrink-0">
                        {spec.label}
                      </span>
                      <span className="font-sans text-sm text-art-charcoal text-right min-w-0 break-words">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>

                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {artwork.tags.map(tag => (
                      <span key={tag} className="font-sans text-[10px] tracking-wide text-art-muted border border-art-pale px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

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
