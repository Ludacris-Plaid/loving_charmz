export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  base_price: number;
  images: string[];
  is_active: boolean;
  is_personalizable: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  shipping_address: Record<string, unknown> | null;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  pet_story: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationRequest {
  id: string;
  user_id: string | null;
  order_id: string | null;
  product_id: string | null;
  pet_name: string | null;
  charm_selections: string[] | null;
  freeform_text: string | null;
  reference_image_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}