import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Never load .env files or inherited VITE credentials into the test build.
const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEOAPIFY_KEY', 'GOOGLE_PLACES_KEY',
  'INSTAGRAM_FEED_URL', 'INSTAGRAM_TOKEN', 'ETSY_API_KEY', 'ETSY_SHOP_ID'];
export default defineConfig({
  plugins: [react()], envDir: false,
  define: Object.fromEntries([
    ...names.map(n => [`import.meta.env.VITE_${n}`, JSON.stringify('')]),
    ['import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY', JSON.stringify('pk_test_local_fixture')],
    ['import.meta.env.VITE_COMING_SOON', JSON.stringify('false')],
  ]),
});
