"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "./Icons";

interface ApiErrorStateProps {
  title?: string;
  description?: string;
  showHomeLink?: boolean;
}

export default function ApiErrorState({
  title = "Unable to Load Collection",
  description = "We could not connect to the Resha backend catalog right now. Please check that the Django API server is running and try again.",
  showHomeLink = true,
}: ApiErrorStateProps) {
  const router = useRouter();

  return (
    <div className="mx-auto my-12 max-w-2xl border border-[#EEDDE2] bg-[#FAF5F6] px-6 py-12 text-center sm:px-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
        Backend Connection Notice
      </p>
      <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] text-[#0E0E10]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#63636B]">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 bg-[#0E0E10] px-7 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
        >
          Try Again
          <ArrowRightIcon className="w-4 h-4" />
        </button>
        {showHomeLink && (
          <Link
            href="/"
            className="inline-flex items-center border border-[#0E0E10] bg-[#FFFFFF] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E0E10] transition-colors hover:border-[#9E5E6A]"
          >
            Return Home
          </Link>
        )}
      </div>
    </div>
  );
}
