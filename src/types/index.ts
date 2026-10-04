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
  video_url?: string;
  quantity?: number;
  tags?: string[];
  variations?: ArtworkVariation[];
  etsy_url?: string;
  etsy_listing_id?: number;
  etsy_data?: EtsyExtras;
  created_at: string;
  updated_at?: string;
}

export interface ArtworkVariation {
  id: string;
  sku?: string;
  options: { name: string; value: string }[];
  price: number;
  quantity: number;
}

export interface EtsyExtras {
  who_made?: string;
  when_made?: string;
  is_supply?: boolean;
  is_customizable?: boolean;
  is_personalizable?: boolean;
  personalization_instructions?: string | null;
  processing_min?: number | null;
  processing_max?: number | null;
  processing_unit?: string | null;
  views?: number;
  num_favorers?: number;
  item_weight?: number | null;
  item_weight_unit?: string | null;
  videos?: { video_url: string; thumbnail_url?: string }[];
  shipping?: {
    profile_title?: string;
    origin_country_iso?: string;
    min_processing_days?: number;
    max_processing_days?: number;
    destinations?: { destination: string; primary_cost?: number; secondary_cost?: number; currency?: string }[];
  } | null;
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
  variation?: ArtworkVariation;
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
  fulfillment_status: 'processing' | 'confirmed' | 'preparing' | 'shipped' | 'delivered';
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
  status: 'pending' | 'accepted' | 'declined';
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
