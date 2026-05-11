import { Layout } from '../components/layout/Layout';
import { Hero } from '../components/sections/Hero';
import { FeaturedCollection } from '../components/sections/FeaturedCollection';
import { ArtistIntro } from '../components/sections/ArtistIntro';
import { NewsletterSection } from '../components/sections/NewsletterSection';
import { InstagramSection } from '../components/sections/InstagramSection';

export function HomePage() {
  return (
    <Layout>
      <Hero />
      <FeaturedCollection />
      <ArtistIntro />
      <NewsletterSection />
      <InstagramSection />
    </Layout>
  );
}
