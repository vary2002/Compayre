// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <nav className="container-max flex items-center justify-between py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-soft">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              Compayre
            </span>
            <span className="text-[11px] text-slate-400">
              Executive Pay Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/about"
            className="text-sm text-slate-300 hover:text-white"
          >
            About
          </Link>
          <Link
            href="/analysis"
            className="text-sm text-slate-300 hover:text-white"
          >
            Product
          </Link>
          <Link
            href="/contact"
            className="text-sm text-slate-300 hover:text-white"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm text-slate-100 shadow-sm shadow-slate-900/60 hover:bg-slate-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white shadow-soft hover:bg-brand-600"
          >
            Get started
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="inline-flex items-center rounded-md border border-slate-700 p-1.5 text-slate-200 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Open menu</span>
          <div className="space-y-1">
            <span className="block h-0.5 w-5 bg-slate-200" />
            <span className="block h-0.5 w-5 bg-slate-200" />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 md:hidden">
          <div className="container-max flex flex-col gap-2 py-3">
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-200"
            >
              About
            </Link>
            <Link
              href="/analysis"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-200"
            >
              Product
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-200"
            >
              Contact
            </Link>
            <div className="mt-2 flex gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-slate-900 px-3 py-1.5 text-center text-sm text-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-brand-500 px-4 py-1.5 text-center text-sm font-medium text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
