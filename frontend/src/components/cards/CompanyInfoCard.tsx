// src/components/CompanyInfoCard.tsx
"use client";
import { formatCurrencyCompact } from "@/utils/currency";
import PieChart from "../charts/PieChart";

interface CompanyInfo {
  name: string;
  isin: string;
  nse: string;
  bse: string;
  sector: string;
  mcap: string;
}

interface CompanyInfoCardProps {
  companyInfo: CompanyInfo;
  fiscalYear: string;
  remunerationData: Array<{
    label: string;
    value: number;
    amount: string;
    color: string;
  }>;
  totalRemuneration: string;
}

export default function CompanyInfoCard({
  companyInfo,
  fiscalYear,
  remunerationData,
  totalRemuneration,
}: CompanyInfoCardProps) {
  const normalisedMarketCap = (() => {
    const raw = companyInfo.mcap;
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const numeric = parseFloat(cleaned);

    if (!Number.isFinite(numeric)) {
      return raw;
    }

    if (/cr/i.test(raw)) {
      return formatCurrencyCompact(numeric * 10_000_000);
    }

    if (/lakh/i.test(raw)) {
      return formatCurrencyCompact(numeric * 100_000);
    }

    if (/bn/i.test(raw)) {
      return formatCurrencyCompact(numeric * 1_000_000_000);
    }

    if (/mn/i.test(raw)) {
      return formatCurrencyCompact(numeric * 1_000_000);
    }

    return formatCurrencyCompact(numeric);
  })();

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Company Info */}
        <div className="lg:w-80">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{companyInfo.name}</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">ISIN</div>
              <div className="text-sm font-medium text-gray-900">{companyInfo.isin}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">NSE Symbol</div>
              <div className="text-sm font-medium text-gray-900">{companyInfo.nse}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">BSE Code</div>
              <div className="text-sm font-medium text-gray-900">{companyInfo.bse}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Sector</div>
              <div className="text-sm font-medium text-gray-900">{companyInfo.sector}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Market Cap</div>
              <div className="text-sm font-semibold text-gray-900">{normalisedMarketCap}</div>
            </div>
          </div>
        </div>

        {/* Right: Executive Director Remuneration Pie Chart */}
        <div className="flex-1 border-l border-gray-200 pl-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">
            Executive Director Remuneration ({fiscalYear})
          </h4>
          {remunerationData.length > 0 ? (
            <PieChart
              data={remunerationData}
              totalAmount={totalRemuneration}
              size="md"
              showLegend={true}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
              Remuneration distribution unavailable for selected directors.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
