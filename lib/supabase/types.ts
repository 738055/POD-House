// Tipos TypeScript mapeados do schema Supabase

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'client' | 'admin';
  points_balance: number;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
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
  description: string | null;
  cost_price: number | null;
  avg_cost: number | null;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
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

// Tabela de itens do carrinho persistente no banco de dados
export interface DbCartItem {
  id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
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
  stock: number; // estoque disponível no momento em que o item foi adicionado
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

/**
 * Configuração de "Produto do Dia".
 * Permite destacar produtos na loja com base em uma data específica ou recorrência semanal.
 */
export interface DailySpecial {
  id: string;
  day_of_week: number | null;    // 0=Dom…6=Sáb — null se for data específica
  scheduled_date: string | null; // 'YYYY-MM-DD' — null se for recorrente
  product_id: string;
  variant_id: string | null;     // null = aplica a todos os sabores
  discount_type: 'percentage' | 'fixed' | 'none';
  discount_value: number;
  highlight_label: string;
  active: boolean;
  created_at: string;
  // joins
  products?: Product | null;
  product_variants?: ProductVariant | null;
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

export interface StoreSettings {
  id: string;
  store_name: string | null;
  logo_url: string | null;
  cover_url: string | null;
  updated_at: string | null;
  store_lat: number | null;
  store_lng: number | null;
  store_address: string | null;
  whatsapp_number: string | null;
  phone_number: string | null;
  address_display: string | null;
  opening_hours: string | null;
  min_order_value: number | null;
  delivery_info: string | null;
  is_open: boolean | null;
  default_delivery_fee: number | null;
  default_delivery_minutes: number | null;
  promo_banner_enabled: boolean | null;
  promo_banner_text: string | null;
  promo_banner_bg_color: string | null;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  order_id: string | null;
  used_at: string;
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Tipagem principal do banco de dados gerada (Database)
export interface Database {
  public: {
    Tables: {
      addresses: { Row: Address; Insert: Partial<Address>; Update: Partial<Address> };
      cart_items: { Row: DbCartItem; Insert: Partial<DbCartItem>; Update: Partial<DbCartItem> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      coupons: { Row: Coupon; Insert: Partial<Coupon>; Update: Partial<Coupon> };
      daily_specials: { Row: DailySpecial; Insert: Partial<DailySpecial>; Update: Partial<DailySpecial> };
      delivery_zones: { Row: DeliveryZone; Insert: Partial<DeliveryZone>; Update: Partial<DeliveryZone> };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      points_transactions: { Row: PointsTransaction; Insert: Partial<PointsTransaction>; Update: Partial<PointsTransaction> };
      product_variants: { Row: ProductVariant; Insert: Partial<ProductVariant>; Update: Partial<ProductVariant> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      promotions: { Row: Promotion; Insert: Partial<Promotion>; Update: Partial<Promotion> };
      scheduled_promotions: { Row: ScheduledPromotion; Insert: Partial<ScheduledPromotion>; Update: Partial<ScheduledPromotion> };
      stock_entries: { Row: StockEntry; Insert: Partial<StockEntry>; Update: Partial<StockEntry> };
      store_settings: { Row: StoreSettings; Insert: Partial<StoreSettings>; Update: Partial<StoreSettings> };
      user_coupons: { Row: UserCoupon; Insert: Partial<UserCoupon>; Update: Partial<UserCoupon> };
      whatsapp_templates: { Row: WhatsappTemplate; Insert: Partial<WhatsappTemplate>; Update: Partial<WhatsappTemplate> };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      validate_coupon: { Args: { p_code: string; p_user_id: string; p_subtotal: number }; Returns: Json };
      place_order: {
        Args: { p_user_id: string; p_address: Json; p_items: Json; p_delivery_fee: number; p_coupon_code?: string; p_points_to_redeem?: number; p_customer_name?: string; p_customer_phone?: string; p_notes?: string; };
        Returns: Json;
      };
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: { orders_count: number; clients_count: number; total_revenue: number; products_count: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
