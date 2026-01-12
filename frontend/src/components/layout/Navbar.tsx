// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LogOut, User, Settings } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/modals/AuthModal";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const scrollDirection = useScrollDirection();
  const { user, logout, isAuthenticated } = useAuth();

  // Hide navbar when scrolling down, show when scrolling up or at top
  const isVisible = scrollDirection === null || scrollDirection === 'up';

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
  };

  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "User";

  return (
    <>
      <header className={`sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="container-max">
          <nav className="flex items-center justify-between py-4">
          
          {/* LEFT: Logo - shifted to left */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 -ml-16">
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
          <div className="hidden items-center gap-4 md:flex -mr-16">
            {!isAuthenticated ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 font-semibold text-white hover:bg-blue-800 transition-colors"
              >
                <User size={18} />
                Log In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2.5 font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <User size={18} />
                  <div className="flex flex-col items-start">
                    <span>{displayName}</span>
                    <span className="text-xs text-blue-600 capitalize">{user?.role || 'user'}</span>
                  </div>
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-600">{user?.email}</p>
                        </div>

                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          user?.subscription_type === 'admin' ? 'bg-blue-100 text-blue-700' :
                          user?.subscription_type === 'subscriber' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {user?.subscription_type === 'admin' ? 'Admin' :
                          user?.subscription_type === 'subscriber' ? 'Subscribed' :
                          'Unsubscribed'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Admin Panel Button - Only visible to admins */}
                    {user?.subscription_type === 'admin' && (
                      <>
                        <div className="border-t border-gray-200"></div>
                        <Link
                          href="/admin"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors w-full"
                        >
                          <Settings size={16} />
                          Admin Panel
                        </Link>
                      </>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
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
        </div>

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
                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      setAuthModalOpen(true);
                      setOpen(false);
                    }}
                    className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-800 transition-colors"
                  >
                    Log In
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">{displayName}</p>
                      <p className="text-xs text-blue-700 mt-1">{user?.email}</p>
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Subscription:</p>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${
                          user?.subscription_type === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user?.subscription_type === 'subscriber' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user?.subscription_type === 'admin' ? 'Admin' :
                           user?.subscription_type === 'subscriber' ? 'Subscribed' :
                           'Unsubscribed'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Admin Panel Link - Only visible to admins */}
                    {user?.subscription_type === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-purple-100 px-4 py-2.5 text-purple-700 hover:bg-purple-200 transition-colors font-medium"
                      >
                        <Settings size={16} />
                        Admin Panel
                      </Link>
                    )}
                    
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

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
