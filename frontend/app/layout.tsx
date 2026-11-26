import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartDrawer from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: {
    default: "RESHA — Modern Classy Women's Wear | Dresses, Skirts, Tops, Pants & Frocks",
    template: "%s | RESHA Womenswear",
  },
  description:
    "Resha designs sleek, classy women's casual wear across dresses, skirts, tops, pants, and frocks with modern tailoring and refined drape.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FFFFFF] text-[#0E0E10] font-sans">
        <CartProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
