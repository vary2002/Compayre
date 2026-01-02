// src/components/CompensationSummaryCards.tsx
"use client";

interface CompensationSummaryCardsProps {
  latestAmount: string;
  latestYear: number | string;
  cagrAmount: string;
  yearsCount: number;
  growthPercent: string | number;
}

export default function CompensationSummaryCards({
  latestAmount,
  latestYear,
  cagrAmount,
  yearsCount,
  growthPercent,
}: CompensationSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-600 mb-1">Latest (FY25)</div>
        <div className="text-lg font-semibold text-gray-900">{latestAmount}</div>
        <div className="text-xs text-gray-500 mt-1">{latestYear}</div>
      </div>
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-600 mb-1">CAGR</div>
        <div className="text-lg font-semibold text-gray-900">{cagrAmount}</div>
        <div className="text-xs text-gray-500 mt-1">{yearsCount} year{yearsCount > 1 ? 's' : ''}</div>
      </div>
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-600 mb-1">Growth</div>
        <div className="text-lg font-semibold text-gray-900">{growthPercent}</div>
        <div className="text-xs text-gray-500 mt-1">Total</div>
      </div>
    </div>
  );
}
