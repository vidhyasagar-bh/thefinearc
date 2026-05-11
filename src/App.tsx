import { Component } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { ArtworkDetailPage } from './pages/ArtworkDetailPage';
import { AboutPage } from './pages/AboutPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminPage } from './pages/AdminPage';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-art-white px-6">
          <div className="text-center space-y-4 max-w-md">
            <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Error</p>
            <h1 className="font-serif text-3xl font-light text-art-charcoal">Something went wrong.</h1>
            <pre className="font-sans text-xs text-red-500 text-left bg-red-50 p-4 rounded overflow-auto">
              {(this.state.error as Error).message}
            </pre>
            <button onClick={() => window.location.reload()} className="font-sans text-sm text-art-muted hover:text-art-charcoal">
              Reload page →
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
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
        <ScrollToTop />
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
      </BrowserRouter>
    </ErrorBoundary>
  );
}
