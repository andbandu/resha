import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9E5E6A]">
        Collection Notice
      </p>
      <h1 className="mt-3 text-4xl font-light tracking-[-0.02em] text-[#0E0E10]">
        Style Not Found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#63636B]">
        This piece is currently unavailable or the link has moved. Explore our
        active collection of dresses, skirts, tops, pants, and frocks.
      </p>
      <Link
        href="/shop"
        className="mt-8 inline-flex items-center gap-2 bg-[#0E0E10] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#FFFFFF] transition-colors hover:bg-[#9E5E6A]"
      >
        Shop Current Collection
        <ArrowRightIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
