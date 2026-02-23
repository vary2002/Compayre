"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);

  const isCompaniesPage = pathname.includes("/companies");
  const isDirectorsPage = pathname.includes("/directors");

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      alert("Please login to access the dashboard.");
      router.push("/");
      return;
    }

    // Check if user has subscriber or admin role
    if (user && user.role !== "subscriber" && user.role !== "admin" && !user.is_staff) {
      setAccessDenied(true);
      alert("You are not subscribed for this service.");
      router.push("/");
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render dashboard if access is denied
  if (accessDenied || !isAuthenticated) {
    return null;
  }

  // Don't render if user doesn't have required role
  if (user && user.role !== "subscriber" && user.role !== "admin" && !user.is_staff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8 px-6 md:px-12 lg:px-16">
          <nav className="flex space-x-1" aria-label="Dashboard pages">
            <Link
              href="/dashboard/companies"
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                isCompaniesPage
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Companies
            </Link>
            <Link
              href="/dashboard/directors"
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                isDirectorsPage
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Directors
            </Link>
          </nav>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
