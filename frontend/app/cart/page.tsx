import React from "react";
import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Shopping Bag",
  description:
    "Review your selected Resha Clothing garments, apply atelier privilege codes, and proceed to checkout.",
};

export default function CartPage() {
  return <CartView />;
}
