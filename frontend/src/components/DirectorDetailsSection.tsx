
"use client";
// src/components/DirectorDetailsSection.tsx

interface DirectorDetailsSectionProps {
  director: DirectorInfo;
  companyName: string;
  companyData: DirectorInfo[];
  directorDetailsRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  toFY: (year: number) => string;
  otherCompanies?: CompanyHistory[];
}

import { RefObject, useMemo } from "react";
import CompensationSummaryCards from "./CompensationSummaryCards";
import MetricCard from "./MetricCard";
import PieChart from "./PieChart";
import OtherCompaniesSection from "./OtherCompaniesSection";
import { buildEsopValueSeries } from "@/utils/esop";
import { StackedBarChart } from "@/components/StackedBarChart";
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
  fairValue?: string;
  aggregateValue?: string;
  retirementBenefits?: string;
  attendance?: string;
}

interface CompanyHistory {
  company: string;
  data: DirectorInfo[];
}

const parseCurrencyValue = (value?: string) => {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/[₹,]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function DirectorDetailsSection({
  director,
  companyName,
  companyData,
  directorDetailsRef,
  onClose,
  toFY,
  otherCompanies,
}: DirectorDetailsSectionProps) {
  const records = companyData
    .filter(d => d.din === director.din)
    .sort((a, b) => b.year - a.year);

  const latestRecord = records[0];
  const esopSeries = useMemo(() => buildEsopValueSeries(records), [records]);

  // Guard: If no records, show a message
  if (!records.length) {
    return (
      <div ref={directorDetailsRef} className="mt-8 bg-linear-to-br from-slate-50 via-white to-white border border-slate-200 ring-1 ring-inset ring-slate-100 rounded-2xl p-6 shadow-lg">
        <div className="mb-6">
          <div className="relative flex justify-between items-start rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-2 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <span>Director detail</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 leading-tight">{director.name}</h3>
              <p className="text-sm text-slate-500 font-mono">DIN: {director.din}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              aria-label="Close director details"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-8 text-center text-gray-500">No data available for this director at {companyName}.</div>
      </div>
    );
  }

  return (
    <div
      ref={directorDetailsRef}
      className="mt-8 bg-linear-to-br from-slate-50 via-white to-white border border-slate-200 ring-1 ring-inset ring-slate-100 rounded-2xl p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="relative flex justify-between items-start rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 " aria-hidden="true"></div>
          <div className="flex flex-col gap-2 pt-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <span>Director detail</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 leading-tight">{director.name}</h3>
            <p className="text-sm text-slate-500 font-mono">DIN: {director.din}</p>
            <div className="text-sm text-slate-700 font-semibold mt-1">Designation (Current): {latestRecord.designation} <span className="text-slate-500 font-normal">at {companyName}</span></div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
            aria-label="Close director details"
          >
            ×
          </button>
        </div>
      </div>

      {/* At Selected Company */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-100 rounded-full">
            Company
          </span>
          <h4 className="text-base font-semibold text-gray-900">
            At {companyName}
          </h4>
        </div>
        <div className="rounded-xl overflow-hidden border border-sky-100 ring-1 ring-inset ring-sky-50 bg-white">
          {/* Compensation Summary */}
          {(() => {
            const sortedRecords = companyData
              .filter(d => d.din === director.din)
              .sort((a, b) => a.year - b.year);

            const compValues = sortedRecords.map(r => parseCurrencyValue(r.compensation));
            
            // Calculate CAGR instead of average
            const cagrValue = computeCAGR(
              sortedRecords.map(record => ({
                year: record.year,
                value: parseCurrencyValue(record.compensation),
              })),
            );
            const cagrPercent = cagrValue === null ? "N/A" : `${(cagrValue * 100).toFixed(1)}%`;
            const latestComp = compValues[compValues.length - 1] ?? 0;

            const growthRate = computeCfsnGrowth(
              sortedRecords.map(record => ({
                year: record.year,
                value: parseCurrencyValue(record.compensation),
              })),
            );
            const growthPercent = growthRate === null ? null : growthRate * 100;
            const growthLabel = growthPercent === null
              ? "N/A"
              : `${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}%`;
            
            return (
              <div className="p-4 bg-sky-50/60 border-t border-sky-100">
                <h5 className="text-sm font-semibold text-sky-800 mb-3">Compensation Summary</h5>
                <CompensationSummaryCards
                  latestAmount={formatCurrencyCompact(latestComp)}
                  latestYear={sortedRecords[sortedRecords.length - 1].year.toString()}
                  cagrAmount={cagrPercent}
                  yearsCount={sortedRecords.length}
                  growthPercent={growthLabel}
                />
              </div>
            );
          })()}

          {/* Key Metrics & Governance */}
          <div className="mt-4 p-4 bg-linear-to-br from-indigo-50 via-white to-white border-t border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">
                Director insight
              </span>
              <h5 className="text-sm font-medium text-gray-900">Key Metrics & Governance</h5>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                // Calculate YoY growth
                let yoyGrowth = 'N/A';
                if (records.length >= 2) {
                  const currentComp = parseCurrencyValue(records[0].compensation);
                  const prevComp = parseCurrencyValue(records[1].compensation);
                  yoyGrowth = ((currentComp - prevComp) / prevComp * 100).toFixed(1) + '%';
                }
                
                // Calculate variable pay ratio
                const salary = parseCurrencyValue(latestRecord.salary);
                const bonus = parseCurrencyValue(latestRecord.bonus);
                const total = salary + bonus;
                const variableRatio = total > 0 ? ((bonus / total) * 100).toFixed(0) + '%' : 'N/A';
                
                // Tenure calculation
                const tenure = records.length;
                
                return (
                  <>
                    <MetricCard 
                      label="YoY Growth" 
                      value={yoyGrowth} 
                      subtitle="Compensation"
                      labelColor="text-emerald-600"
                      valueColor="text-emerald-700"
                      subtitleColor="text-emerald-500"
                    />
                    <MetricCard 
                      label="Variable Pay" 
                      value={variableRatio} 
                      subtitle="of Fixed+Variable"
                      labelColor="text-amber-600"
                      valueColor="text-amber-700"
                      subtitleColor="text-amber-500"
                    />
                    <MetricCard 
                      label="Tenure" 
                      value={`${tenure} ${tenure === 1 ? 'Year' : 'Years'}`} 
                      subtitle="At Company"
                      labelColor="text-indigo-600"
                      valueColor="text-indigo-700"
                      subtitleColor="text-indigo-500"
                    />
                  </>
                );
              })()}
            </div>
            
          </div>

          {/* Detailed Breakdowns and Visualizations */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ESOP Market Value (Improved UI) */}
            <div className="border border-violet-100 ring-1 ring-inset ring-violet-50 rounded-xl p-6 bg-white/95">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h6 className="text-base font-bold text-violet-800 mb-1">ESOP Market Value</h6>
                  <div className="text-xs text-gray-500">(Last 5 Years)</div>
                </div>
                <div className="bg-teal-600 px-5 py-2 rounded-lg shadow text-white text-lg font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/80 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3 0 1.657 1.343 3 3 3s3-1.343 3-3c0-1.657-1.343-3-3-3zm0 13c-4.418 0-8-3.582-8-8 0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.418-3.582 8-8 8z"/></svg>
                  {formatCurrencyCompact(companyData.filter(d => d.din === director.din).reduce((sum, r) => sum + parseCurrencyValue(r.esopValue), 0))}
                  <span className="text-xs font-medium text-white/80">total market value</span>
                </div>
              </div>
              {(() => {
                const sortedRecords = companyData
                  .filter(d => d.din === director.din)
                  .sort((a, b) => a.year - b.year);
                const hasEsopValue = sortedRecords.some(r => parseCurrencyValue(r.esopValue) > 0);
                if (!hasEsopValue) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No ESOP market value data available
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left border-separate border-spacing-y-1">
                      <thead>
                        <tr className="text-gray-700">
                          <th className="px-2 py-1">Year</th>
                          <th className="px-2 py-1">Market Value</th>
                          <th className="px-2 py-1">Options</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRecords.map((record, idx) => (
                          <tr key={idx} className="bg-violet-50/60 hover:bg-violet-100/80 rounded">
                            <td className="px-2 py-1 font-semibold text-violet-800">{toFY(record.year)}</td>
                            <td className="px-2 py-1 text-teal-700 font-bold">{formatCurrencyCompact(parseCurrencyValue(record.esopValue))}</td>
                            <td className="px-2 py-1 text-purple-700">{record.esops ? record.esops.toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Total options granted (last 5 years):</span>
                        <span className="inline-block bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                          {sortedRecords.reduce((sum, r) => sum + (r.esops || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Compensation Components Breakdown */}
            <div className="border border-sky-100 ring-1 ring-inset ring-sky-50 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all duration-300">
              <h6 className="text-base font-bold text-slate-800 mb-4">
                Compensation Components ({toFY(latestRecord.year)})
              </h6>
              {(() => {
                const components = [
                  { label: 'Salary', amountRupees: parseCurrencyValue(latestRecord.salary), color: '#3B82F6' },
                  { label: 'Bonus', amountRupees: parseCurrencyValue(latestRecord.bonus), color: '#10B981' },
                  { label: 'Perquisites', amountRupees: parseCurrencyValue(latestRecord.perquisites), color: '#F59E0B' },
                  { label: 'Retirement', amountRupees: parseCurrencyValue(latestRecord.retirementBenefits), color: '#8B5CF6' },
                ].filter(c => c.amountRupees > 0);
                
                if (components.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Detailed breakdown not available
                    </div>
                  );
                }
                
                const total = components.reduce((sum, c) => sum + c.amountRupees, 0);
                
                const pieData = components.map(component => ({
                  label: component.label,
                  value: total === 0 ? 0 : (component.amountRupees / total) * 100,
                  amount: formatCurrencyCompact(component.amountRupees),
                  color: component.color,
                }));
                
                return (
                  <PieChart 
                    data={pieData} 
                    totalAmount={formatCurrencyCompact(total)} 
                    size="md"
                    showLegend={true}
                  />
                );
              })()}
            </div>

            {/* Stacked Bar Chart: Compensation Components by Year */}
            <div className="lg:col-span-2">
              {(() => {
                const stackedData = companyData
                  .filter(d => d.din === director.din)
                  .sort((a, b) => a.year - b.year)
                  .map(r => {
                    const salary = parseCurrencyValue(r.salary);
                    const retirement = parseCurrencyValue(r.retirementBenefits);
                    const perquisites = parseCurrencyValue(r.perquisites);
                    const bonus = parseCurrencyValue(r.bonus);
                    // payExclEsops = total compensation minus ESOP value if available, else sum of components
                    const comp = parseCurrencyValue(r.compensation);
                    const esopValue = parseCurrencyValue(r.esopValue);
                    // If comp and esopValue are available, subtract esopValue from comp, else sum components
                    const payExclEsops =
                      comp && esopValue
                        ? Math.max(comp - esopValue, 0)
                        : salary + retirement + perquisites + bonus;
                    return {
                      year: r.year,
                      salary,
                      retirement,
                      perquisites,
                      bonus,
                      payExclEsops,
                      esops: r.esops || 0,
                    };
                  });
                return <StackedBarChart data={stackedData} />;
              })()}
            </div>

            {/* Tenure Timeline */}
            {/* Tenure Timeline removed: show only current designation at top */}
          </div>
        </div>

        {otherCompanies && otherCompanies.length > 0 && (
          <div className="mt-8 pt-6 border-t border-indigo-100">
            <OtherCompaniesSection
              companyDataList={otherCompanies}
              currentCompany={companyName}
              embedded
            />
          </div>
        )}
      </div>
    </div>
  );
}
