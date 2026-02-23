// src/components/OtherCompaniesSection.tsx
"use client";

import CompensationSummaryCards from "../cards/CompensationSummaryCards";
import { formatCurrencyCompact } from "@/utils/currency";
import { computeCfsnGrowth, computeCAGR } from "@/utils/growth";

interface DirectorInfo {
  name: string;
  din: string;
  designation: string;
  year: number;
  compensation: string;
  salary?: string;
  bonus?: string;
  perquisites?: string;
  esops?: number;
  esopValue?: string;
  retirementBenefits?: string;
  // attendance removed
}

interface CompanyData {
  company: string;
  data: DirectorInfo[];
}

interface OtherCompaniesSectionProps {
  companyDataList: CompanyData[];
  currentCompany: string;
  embedded?: boolean;
}

const parseCompensation = (value?: string) => {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/[₹,]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function OtherCompaniesSection({ companyDataList, currentCompany, embedded = false }: OtherCompaniesSectionProps) {
  const filteredCompanies = companyDataList.filter(cd => cd.company !== currentCompany);
  
  if (filteredCompanies.length === 0) {
    return null;
  }

  return (
    <div className={embedded ? "" : "mt-8"}>
      <h4
        className={`${embedded ? "text-lg" : "text-xl"} font-bold text-slate-700 ${embedded ? "mb-4" : "mb-5"} flex items-center gap-3`}
      >
        <span
          className={`${embedded ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-full font-semibold shadow-lg`}
        >
          Other Companies
        </span>
        <span className="text-slate-800">Employment History</span>
      </h4>
      <div className="space-y-4">
        {filteredCompanies.map((companyData, companyIdx) => (
          <div
            key={companyIdx}
            className={`${embedded ? "border border-slate-200" : "border-2 border-slate-300"} bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300`}
          >
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-5 py-3">
              <h5 className="font-bold text-slate-800">{companyData.company}</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Year</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Compensation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {companyData.data
                    .sort((a, b) => b.year - a.year)
                    .map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-5 py-3 text-sm text-slate-900">{record.year}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-700">{record.compensation}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            
            {/* Compensation Summary */}
            {(() => {
              const records = [...companyData.data].sort((a, b) => a.year - b.year);
              if (records.length === 0) {
                return null;
              }
              const compValues = records.map(r => parseCompensation(r.compensation));
              
              // Calculate CAGR instead of average
              const cagrValue = computeCAGR(
                records.map(record => ({
                  year: record.year,
                  value: parseCompensation(record.compensation),
                })),
              );
              const cagrPercent = cagrValue === null ? "N/A" : `${(cagrValue * 100).toFixed(1)}%`;
              const latestComp = compValues[compValues.length - 1] ?? 0;

              const growthRate = computeCfsnGrowth(
                records.map(record => ({
                  year: record.year,
                  value: parseCompensation(record.compensation),
                })),
              );
              const growthPercent = growthRate === null ? null : growthRate * 100;
              const growthLabel = growthPercent === null
                ? "N/A"
                : `${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}%`;

              return (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Compensation Summary</h5>
                  <CompensationSummaryCards
                    latestAmount={formatCurrencyCompact(latestComp)}
                    latestYear={records[records.length - 1].year.toString()}
                    cagrAmount={cagrPercent}
                    yearsCount={records.length}
                    growthPercent={growthLabel}
                  />
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
