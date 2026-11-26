export type Category = "Dresses" | "Skirts" | "Tops" | "Pants" | "Frocks";

export type SizeOption = "XS" | "S" | "M" | "L" | "XL";

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
  compareAtPrice?: number;
  badge?: string;
  fabric: string;
  fabricFamily:
    | "Soft Mulberry Silk"
    | "Breathable Linen"
    | "Combed Cotton"
    | "Soft Rib Knit";
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
}

export interface OrderRecord {
  orderNumber: string;
  placedAt: string;
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
  giftNote?: string;
  items: CartItem[];
}
