import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <Layout>
      {/* Hero */}
      <div className="relative pt-24 md:pt-0">
        <div className="h-[60vh] md:h-[80vh] relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=2000&q=85"
            alt="Artist studio"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />
          <div className="absolute bottom-12 left-6 md:left-20">
            <FadeIn>
              <h1 className="font-serif text-5xl md:text-7xl font-light text-art-white leading-tight">
                The Artist
              </h1>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* Statement */}
      <section className="py-24 md:py-40 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <FadeIn direction="left">
              <div className="aspect-[3/4] overflow-hidden bg-cream-100 sticky top-32">
                <img
                  src="https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=800&q=85"
                  alt="Artist portrait"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <FadeIn direction="right" delay={0.15}>
              <div className="space-y-10">
                <div>
                  <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
                    Artist Statement
                  </p>
                  <h2 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal leading-tight">
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
                  src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&q=85"
                  alt="Studio process"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="aspect-video overflow-hidden bg-cream-100">
                <img
                  src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=85"
                  alt="Materials and tools"
                  className="w-full h-full object-cover"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 bg-art-charcoal text-art-white text-center px-6">
        <FadeIn>
          <div className="max-w-lg mx-auto space-y-7">
            <h2 className="font-serif text-4xl md:text-5xl font-light leading-tight">
              Collect something
              <br /><em>that matters.</em>
            </h2>
            <p className="font-sans text-sm text-art-white/50 leading-relaxed">
              Browse available works, or enquire about a commission made specifically for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link to="/gallery">
                <button className="font-sans text-[11px] tracking-widest uppercase px-8 py-4 border border-art-white text-art-white hover:bg-art-white hover:text-art-charcoal transition-all duration-400">
                  Browse the Gallery
                </button>
              </Link>
              <Link to="/commissions">
                <button className="font-sans text-[11px] tracking-widest uppercase text-art-white/50 hover:text-art-white border-b border-art-white/20 hover:border-art-white/60 pb-0.5 transition-all duration-300">
                  Commission a Work
                </button>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </Layout>
  );
}
