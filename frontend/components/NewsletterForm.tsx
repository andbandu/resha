"use client";

import React, { useState } from "react";
import { ApiRequestError, subscribeNewsletter } from "@/lib/catalog";
import type { NewsletterResponse } from "@/lib/types";
import { ArrowRightIcon, CheckIcon } from "./Icons";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NewsletterResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await subscribeNewsletter(trimmed, "footer");
      setResult(response);
      setEmail("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Could not subscribe right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex items-start gap-2.5 border border-[#3E2E33] bg-[#1D1719] p-3.5 text-xs text-[#F5E6EA]">
        <CheckIcon className="mt-0.5 w-4 h-4 shrink-0 text-[#E8B4BE]" />
        <p className="leading-relaxed">
          {result.message} Enjoy 10% off your first order with code{" "}
          <span className="font-mono font-medium text-[#E8B4BE]">
            {result.promoCode}
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex border border-[#2C2C32] bg-[#18181C] focus-within:border-[#E8B4BE]">
        <input
          type="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter your email"
          aria-label="Email address for new arrivals newsletter"
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder:text-[#7E7E88] focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label="Subscribe to newsletter"
          className="flex items-center justify-center px-4 text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A] disabled:opacity-60"
        >
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-[#F2B8B5]">{error}</p>}
      <p className="text-[11px] leading-relaxed text-[#8E8E98]">
        Early access to new dresses, skirts, tops, pants, and day frocks.
      </p>
    </form>
  );
}
