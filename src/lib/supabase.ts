import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          title: string;
          description: string;
          story: string | null;
          price: number;
          dimensions: string;
          materials: string;
          category: string;
          images: string[];
          availability: string;
          framing: string | null;
          year: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['artworks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['artworks']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          customer_name: string;
          customer_email: string;
          customer_address: Record<string, string>;
          items: Record<string, unknown>[];
          total: number;
          payment_status: string;
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      commission_inquiries: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          project_description: string;
          budget: string;
          size_preferences: string | null;
          style_preferences: string | null;
          color_preferences: string | null;
          reference_image_url: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['commission_inquiries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['commission_inquiries']['Insert']>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>;
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string | null;
          message: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contact_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>;
      };
    };
  };
};
