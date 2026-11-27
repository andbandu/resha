export type Category = "Dresses" | "Skirts" | "Tops" | "Pants" | "Frocks" | (string & {});

export type SizeOption = "XS" | "S" | "M" | "L" | "XL";

export type FabricFamily =
  | "Soft Mulberry Silk"
  | "Breathable Linen"
  | "Combed Cotton"
  | "Soft Rib Knit"
  | (string & {});

export interface CategoryItem {
  name: Category;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  productCount: number;
}

export interface CollectionItem {
  name: string;
  slug: string;
  description: string;
  productCount: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  image: string;
}

export interface ProductSizeStock {
  size: SizeOption;
  inStock: boolean;
  stockCount: number;
}

export interface ProductImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  sizePurchased: string;
  fitFeedback: "Runs Small" | "True to Size" | "Runs Large";
  comment: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  category: Category;
  collection: string;
  price: number;
  compareAtPrice?: number | null;
  badge?: string | null;
  fabric: string;
  fabricFamily: FabricFamily;
  gsm: string;
  origin: string;
  description: string;
  details: string[];
  fitNotes: string;
  careInstructions: string[];
  colors: ProductColor[];
  sizes: ProductSizeStock[];
  images: ProductImage[];
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  featured?: boolean;
  isNew?: boolean;
}

export interface ProductDetail extends Product {
  relatedProducts?: Product[];
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  sku: string;
  name: string;
  fabric: string;
  price: number;
  image: string;
  colorName: string;
  colorHex: string;
  size: SizeOption;
  quantity: number;
}

export interface PromoCode {
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount?: number;
}

export interface PromoValidationResponse {
  ok: boolean;
  message: string;
  promo: PromoCode | null;
  subtotal?: number;
  discountAmount: number;
}

export interface CheckoutItemPayload {
  productId: string;
  colorName: string;
  size: SizeOption;
  quantity: number;
}

export interface OrderQuoteItem {
  key: string;
  productId: string;
  slug: string;
  sku: string;
  name: string;
  fabric: string;
  image: string;
  colorName: string;
  colorHex: string;
  size: SizeOption;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
  availableStock: number;
}

export interface OrderQuoteResponse {
  items: OrderQuoteItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  promoCode: string;
  promoApplied: PromoCode | null;
  promoMessage: string;
  freeShippingThreshold: number;
  standardShippingCost: number;
  expressShippingCost: number;
  taxRatePercent: number;
}

export interface StoreConfig {
  storeName: string;
  freeShippingThreshold: number;
  standardShippingCost: number;
  expressShippingCost: number;
  taxRatePercent: number;
  announcementText: string;
  featuredPromoCode: string;
}

export interface OrderRecord {
  orderNumber: string;
  placedAt: string;
  status?: string;
  paymentMethod?: "card" | "cod";
  paymentStatus?: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  shippingMethodLabel: string;
  shippingCost: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  giftWrap: boolean;
  giftNote?: string | null;
  promoCode?: string;
  trackingNumber?: string;
  items: CartItem[];
}

export interface CheckoutOrderPayload {
  email: string;
  newsletter: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryMethod: "standard" | "express" | "studio";
  giftWrap: boolean;
  giftNote: string;
  paymentMethod: "card" | "cod";
  promoCode: string;
  items: CheckoutItemPayload[];
}

export interface ReviewCreatePayload {
  author: string;
  location: string;
  rating: number;
  sizePurchased: SizeOption;
  fitFeedback: "Runs Small" | "True to Size" | "Runs Large";
  comment: string;
}

export interface NewsletterResponse {
  ok: boolean;
  created: boolean;
  email: string;
  promoCode: string;
  message: string;
}
