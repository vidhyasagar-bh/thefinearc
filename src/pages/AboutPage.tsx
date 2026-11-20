import { ArtworkCarousel } from '../components/artwork/ArtworkCarousel';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';

export function AboutPage() {
  return (
    <Layout>
      {/* Hero */}
      <div className="pt-20 bg-cream-100">
        <div className="lg:grid lg:grid-cols-[1fr_auto] lg:h-[calc(100vh-5rem)]">
          {/* Exact photo proportions (1663×2000) so nothing is cropped */}
          <div className="relative aspect-[1663/2000] lg:aspect-auto lg:h-full lg:w-[calc((100vh-5rem)*0.8315)] overflow-hidden lg:order-2">
            <img
              src="/artist.jpg"
              alt="The artist with her hand-painted mandala artworks"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center px-6 lg:px-12 xl:px-20 py-12 lg:py-0 lg:order-1">
            <FadeIn>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-7xl font-light text-art-charcoal leading-tight">
                Meet The Artist
              </h1>
            </FadeIn>
          </div>
        </div>
      </div>

      <section aria-label="About Leela" className="py-16 md:py-24 px-6 md:px-12 bg-art-white">
        <FadeIn className="max-w-prose mx-auto space-y-6 font-sans text-sm text-art-warm leading-relaxed">
          <p>
            Art has been a constant thread throughout my life. Some of my earliest memories are of watching my father sketch—the quiet assurance in his hands, the way a simple pencil could transform a blank page into something full of life. Growing up in a small town in India, creativity was woven into everyday moments. I found joy in drawing houses, trees, mangoes, and intricate patterns, never realizing how deeply those early experiences would shape me.
          </p>
          <p>
            As life evolved and I moved to the United States, art gradually slipped into the background. Yet it never truly left. Years later, through simple moments of coloring with my daughters and rediscovering creativity during the pandemic, I found myself returning to what had always felt familiar.
          </p>
          <p>
            In September 2024, I made the conscious decision to begin creating again. What started as exploration soon became a dedicated practice of learning, experimenting, and refining my craft. It was during this journey that I discovered mandala art—and immediately felt a profound connection to its rhythm, precision, and quiet beauty.
          </p>
          <p>
            Today, my work is defined by intricate detail, harmonious color, and thoughtful composition. Every piece is created with patience and intention, inviting moments of stillness, reflection, and connection.
          </p>
          <p>
            For me, creating art is more than an artistic practice; it is a return to something deeply familiar—a lifelong conversation with creativity that had been waiting to be rediscovered.
          </p>
        </FadeIn>
      </section>

      <ArtworkCarousel />
    </Layout>
  );
}
