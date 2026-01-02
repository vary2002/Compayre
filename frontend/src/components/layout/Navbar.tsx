// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("John Doe");
  const [showDropdown, setShowDropdown] = useState(false);
  const scrollDirection = useScrollDirection();

  // Hide navbar when scrolling down, show when scrolling up or at top
  const isVisible = scrollDirection === null || scrollDirection === 'up';

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setShowDropdown(false);
  };

  return (
    <header className={`sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur transition-transform duration-300 ease-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <nav className="container-max flex items-center justify-between py-4">
        
        {/* LEFT: Logo - shifted to left */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/assets/iias/banner.svg"
            width={42}
            height={42}
            alt="Compayre"
            className="h-10 w-auto"
          />
        </Link>

        {/* CENTER: Navigation Links - Updated order and styling */}
        <div className="hidden md:flex flex-1 justify-center gap-12">
          {["Dashboard", "About", "Demo", "Contact"].map((item) => {
            const href =
              item === "Dashboard" ? "/dashboard" : `/${item.toLowerCase()}`;

            return (
              <Link
                key={item}
                href={href}
                className="group relative text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {item}
                <span
                  className="absolute left-0 -bottom-1.5 h-0.5 w-0 bg-blue-600 transition-all duration-300 group-hover:w-full"
                ></span>
              </Link>
            );
          })}
        </div>

        {/* RIGHT: Auth Buttons */}
        <div className="hidden items-center gap-4 md:flex">
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              <User size={18} />
              Log In
            </Link>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2.5 font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <User size={18} />
                {username}
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-200 p-1.5 text-gray-700 md:hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
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
          <div className="container-max flex flex-col gap-1 py-3 text-sm">
            <Link 
              href="/dashboard" 
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/about" 
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium"
            >
              About
            </Link>
            <Link 
              href="/demo" 
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium"
            >
              Demo
            </Link>
            <Link 
              href="/contact" 
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium"
            >
              Contact
            </Link>

            <div className="mt-4 pt-3 border-t border-gray-200">
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="w-full block rounded-lg bg-blue-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-800 transition-colors"
                >
                  Log In
                </Link>
              ) : (
                <div className="space-y-2">
                  <div className="px-4 py-2.5 rounded-lg bg-blue-100 text-blue-700 font-medium">
                    {username}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
