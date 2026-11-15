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
              <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-5">
                The Fine Arc
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-7xl font-light text-art-charcoal leading-tight">
                The Artist
              </h1>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* Statement */}
      <section className="py-16 md:py-40 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-8xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="md:col-span-1 lg:col-span-4">
            <FadeIn direction="left">
              <div className="aspect-[4/3] sm:aspect-[3/4] overflow-hidden bg-cream-100 md:sticky md:top-32">
                <img
                  src="https://picsum.photos/seed/artist-portrait/800/1000"
                  alt="Artist portrait"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
          </div>

          <div className="md:col-span-1 lg:col-span-7 lg:col-start-6">
            <FadeIn direction="right" delay={0.15}>
              <div className="space-y-10">
                <div>
                  <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
                    Artist Statement
                  </p>
                  <h2 className="font-serif text-3xl md:text-5xl font-light text-art-charcoal leading-tight">
                    Art has been a constant thread throughout my life.
                  </h2>
                </div>

                <div className="space-y-6 font-sans text-sm text-art-warm leading-relaxed max-w-lg">
                  <p>
                    Some of my earliest memories are of watching my father sketch—the quiet assurance in his hands, the way a simple pencil could transform a blank page into something full of life. Growing up in a small town in India, creativity was woven into everyday moments. I found joy in drawing houses, trees, mangoes, and intricate patterns, never realizing how deeply those early experiences would shape me.
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
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 md:py-32 bg-cream-100">
        <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                title: 'Originals only',
                body: 'Every work is a unique object. No editions, no reproductions — because the physical thing matters.',
              },
              {
                title: 'Slow practice',
                body: "Each painting takes weeks or months. Rushed work reveals itself. I'd rather make fewer things, more deeply.",
              },
              {
                title: 'Made to last',
                body: 'I use archival materials and traditional techniques. These are objects for the next hundred years, not the next trend.',
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="space-y-4">
                  <div className="w-8 h-px bg-art-light" />
                  <h3 className="font-serif text-xl font-light text-art-charcoal">{item.title}</h3>
                  <p className="font-sans text-sm text-art-muted leading-relaxed">{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 md:py-40 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-8xl mx-auto">
          <FadeIn>
            <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
              The Process
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal mb-16">
              From looking to making
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeIn>
              <div className="aspect-video overflow-hidden bg-cream-100">
                <img
                  src="https://picsum.photos/seed/process1/1200/800"
                  alt="Studio process"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="aspect-video overflow-hidden bg-cream-100">
                <img
                  src="https://picsum.photos/seed/process2/1200/800"
                  alt="Materials and tools"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

    </Layout>
  );
}
