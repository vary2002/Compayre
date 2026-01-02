"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCompaniesPage = pathname.includes("/companies");
  const isDirectorsPage = pathname.includes("/directors");

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
