// Tipos TypeScript mapeados do schema Supabase

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'client' | 'admin';
  points_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  logradouro: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  uf: string;
  cep: string;
  is_default: boolean;
  created_at: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  name_normalized: string;
  cep_prefix: string | null;
  delivery_fee: number;
  estimated_minutes: number;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  image_url: string | null;
  price_override: number | null;
  stock: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  puffs: string | null;
  is_featured: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // relacionamentos
  categories?: Category | null;
  product_variants?: ProductVariant[];
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  badge: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number;
  min_order_value: number;
  max_uses_total: number | null;
  max_uses_per_user: number;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  address_logradouro: string;
  address_number: string;
  address_complement: string | null;
  address_neighborhood: string;
  address_city: string;
  address_uf: string;
  address_cep: string;
  subtotal: number;
  delivery_fee: number;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount: number;
  points_redeemed: number;
  points_discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  whatsapp_sent: boolean;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  type: 'earn' | 'redeem' | 'expire' | 'adjustment';
  points: number;
  description: string | null;
  created_at: string;
}

// Tipo usado no carrinho em memória / localStorage
export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
}

// Resultado do validate_coupon RPC
export interface CouponValidation {
  valid: boolean;
  error?: string;
  type?: 'percentage' | 'fixed' | 'free_delivery';
  value?: number;
  discount?: number;
  coupon_id?: string;
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  slug: string;
  category: 'order_confirmation' | 'order_status' | 'promotion' | 'welcome' | 'custom';
  message: string;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPromotion {
  id: string;
  title: string;
  description: string | null;
  promotion_id: string | null;
  coupon_id: string | null;
  scheduled_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  active: boolean;
  created_at: string;
  // joins
  promotions?: Promotion | null;
  coupons?: Coupon | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  radius_meters: number;
  delivery_fee: number;
  estimated_minutes: number;
  color: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  polygon: [number, number][] | null;
  polygon_source: 'nominatim' | 'manual' | null;
}

export interface StockEntry {
  id: string;
  variant_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  cost_per_unit: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Placeholder para o tipo Database gerado pelo Supabase CLI
// Substitua por `supabase gen types typescript` quando disponível
export type Database = Record<string, unknown>;
