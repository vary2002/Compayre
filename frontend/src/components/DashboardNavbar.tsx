// src/components/DashboardNavbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function DashboardNavbar() {
  const [open, setOpen] = useState(false);
  const scrollDirection = useScrollDirection();

  // Show navbar when at top of page (scrollY = 0) or when scrolling up
  const isVisible = scrollDirection === null || scrollDirection === 'up';

  return (
    <header
      className={`fixed top-0 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <nav className="container-max flex items-center justify-between py-4">
        
        {/* LEFT: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/iias/banner.svg"
            width={42}
            height={42}
            alt="Compayre"
            className="h-10 w-auto"
          />
        </Link>

        {/* CENTER: Navigation Links */}
        <div className="hidden md:flex flex-1 justify-center gap-10">
          {["About", "Dashboard", "Demo", "Contact"].map((item) => {
            const href =
              item === "Dashboard" ? "/dashboard" : `/${item.toLowerCase()}`;

            return (
              <Link
                key={item}
                href={href}
                className="group relative text-base md:text-lg font-semibold text-gray-800 hover:text-gray-900 transition"
              >
                {item}
                <span
                  className="absolute left-0 -bottom-1.5 h-[3px] w-0 bg-teal-500 transition-all duration-300 group-hover:w-full"
                ></span>
              </Link>
            );
          })}
        </div>

        {/* RIGHT: Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-4 py-1.5 md:text-lg font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-teal-500 px-5 py-1.5 md:text-lg font-semibold text-white hover:bg-teal-700 transition"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-200 p-1.5 text-gray-700 md:hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
        >
          <span className="h-0.5 w-5 bg-gray-700 block mb-1"></span>
          <span className="h-0.5 w-5 bg-gray-700 block"></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="container-max flex flex-col gap-2 py-3 text-sm">
            <Link href="/about" onClick={() => setOpen(false)}>
              About
            </Link>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <Link href="/demo" onClick={() => setOpen(false)}>
              Demo
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)}>
              Contact
            </Link>

            <div className="mt-3 flex gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-center"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-teal-500 px-4 py-1.5 text-center font-medium text-white"
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
