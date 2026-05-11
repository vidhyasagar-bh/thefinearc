import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { PageLoader } from './components/ui/LoadingSpinner';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })));
const ArtworkDetailPage = lazy(() => import('./pages/ArtworkDetailPage').then(m => ({ default: m.ArtworkDetailPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const CommissionsPage = lazy(() => import('./pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-art-white">
      <div className="text-center space-y-4">
        <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">404</p>
        <h1 className="font-serif text-4xl font-light text-art-charcoal">Page not found.</h1>
        <a href="/" className="block mt-6 font-sans text-sm text-art-muted hover:text-art-charcoal transition-colors">
          Return home →
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#2C2825',
            color: '#FDFCFA',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            borderRadius: '0',
            padding: '12px 20px',
          },
          duration: 3000,
        }}
      />
      <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/commissions" element={<CommissionsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
    </BrowserRouter>
  );
}
