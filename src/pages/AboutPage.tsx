import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';

export function AboutPage() {
  return (
    <Layout>
      {/* Hero */}
      <div className="pt-20 md:pt-20 bg-cream-100">
        <div className="md:grid md:grid-cols-2 md:h-[calc(100vh-5rem)] md:min-h-[560px]">
          <div className="relative aspect-[5/6] md:aspect-auto md:h-full overflow-hidden md:order-2">
            <img
              src="/artist.jpg"
              alt="The artist with her hand-painted mandala artworks"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 md:hidden" />
          </div>
          <div className="flex items-center px-6 md:px-12 lg:px-20 py-12 md:py-0 md:order-1">
            <FadeIn>
              <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-5">
                The Fine Arc
              </p>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-art-charcoal leading-tight">
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
                    I make things that take time to understand.
                  </h2>
                </div>

                <div className="space-y-6 font-sans text-sm text-art-warm leading-relaxed max-w-lg">
                  <p>
                    I came to painting through drawing, and to drawing through long hours of looking at things without trying to record them. The work began when I stopped trying to capture and started trying to understand.
                  </p>
                  <p>
                    My paintings are slow. Not because I intend them to be, but because the subjects I'm interested in — light in rooms, the weight of silence, the texture of ordinary time — resist being hurried.
                  </p>
                  <p>
                    I work in oil and watercolour, in graphite and gouache. I return to the same subjects with different eyes. I am less interested in originality than in depth.
                  </p>
                  <p>
                    Each work is made once, offered once. I don't reproduce my paintings. The object itself is the point — its weight, its marks, its evidence of time spent.
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
