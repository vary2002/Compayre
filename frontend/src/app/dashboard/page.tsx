// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import CompareTab from "./components/CompareTab";
import LookupTab from "./components/LookupTab";
import { DashboardNavbar } from "@/components/DashboardNavbar";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"lookup" | "compare">("lookup");
  const [isCompareWide, setIsCompareWide] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only run on client
    const stored = typeof window !== "undefined" ? localStorage.getItem("dashboard_activeTab") : null;
    if (stored === "lookup" || stored === "compare") {
      setActiveTab(stored);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (activeTab !== "compare") {
      setIsCompareWide(false);
    }
    if (ready) {
      localStorage.setItem("dashboard_activeTab", activeTab);
    }
  }, [activeTab, ready]);

  if (!ready) return null;

  const containerClasses =
    activeTab === "compare" && isCompareWide
      ? "w-full px-4 py-8"
      : "container mx-auto px-4 py-8";

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <DashboardNavbar />
      <div className={containerClasses}>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("lookup")}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "lookup"
                  ? "border-b-2 border-blue-600 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Companies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "compare"
                  ? "border-b-2 border-blue-600 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Compare
            </button>
          </div>
          <div className="p-6">
            {activeTab === "lookup" ? <LookupTab /> : <CompareTab onLayoutModeChange={setIsCompareWide} />}
          </div>
        </div>
      </div>
    </div>
  );
}