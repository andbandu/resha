import React from "react";
import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Complete your Resha Clothing order with worldwide tracked dispatch or Lodhi Atelier pickup.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
