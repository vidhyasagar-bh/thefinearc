export interface Artwork {
  id: string;
  title: string;
  description: string;
  story?: string;
  price: number;
  dimensions: string;
  materials: string;
  category: ArtworkCategory;
  images: string[];
  availability: 'available' | 'sold' | 'reserved';
  framing?: string;
  year?: number;
  created_at: string;
  updated_at?: string;
}

export type ArtworkCategory =
  | 'painting'
  | 'drawing'
  | 'print'
  | 'photography'
  | 'mixed-media'
  | 'sculpture'
  | 'commission';

export interface CartItem {
  artwork: Artwork;
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_address: Address;
  items: OrderItem[];
  total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface OrderItem {
  artwork_id: string;
  artwork_title: string;
  quantity: number;
  price: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CommissionInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  project_description: string;
  budget: string;
  size_preferences?: string;
  style_preferences?: string;
  color_preferences?: string;
  reference_image_url?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  created_at: string;
}
