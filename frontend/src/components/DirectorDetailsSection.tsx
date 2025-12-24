
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
import EsopValueChart from "@/components/EsopValueChart";
import CompensationSummaryCards from "./CompensationSummaryCards";
import MetricCard from "./MetricCard";
import PieChart from "./PieChart";
import OtherCompaniesSection from "./OtherCompaniesSection";
import { buildEsopValueSeries } from "@/utils/esop";
import { formatCurrencyCompact } from "@/utils/currency";
import { computeCfsnGrowth } from "@/utils/growth";

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
  
  return (
    <div
      ref={directorDetailsRef}
      className="mt-8 bg-gradient-to-br from-slate-50 via-white to-white border border-slate-200 ring-1 ring-inset ring-slate-100 rounded-2xl p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="relative flex justify-between items-start rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 " aria-hidden="true"></div>
          <div className="flex flex-col gap-2 pt-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <span>Director detail</span>
              <span className="text-indigo-400">Live</span>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Compensation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{record.year}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.designation}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.compensation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Compensation Summary */}
          {(() => {
            const sortedRecords = companyData
              .filter(d => d.din === director.din)
              .sort((a, b) => a.year - b.year);

            const compValues = sortedRecords.map(r => parseCurrencyValue(r.compensation));
            const avgComp = compValues.length > 0
              ? compValues.reduce((a, b) => a + b, 0) / compValues.length
              : 0;
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
                  averageAmount={formatCurrencyCompact(avgComp)}
                  yearsCount={sortedRecords.length}
                  growthPercent={growthLabel}
                />
              </div>
            );
          })()}

          {/* Key Metrics & Governance */}
          <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 via-white to-white border-t border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">
                Director insight
              </span>
              <h5 className="text-sm font-medium text-gray-900">Key Metrics & Governance</h5>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      label="Attendance" 
                      value={latestRecord.attendance || 'N/A'} 
                      subtitle="Executive Director Meetings"
                      labelColor="text-sky-600"
                      valueColor="text-sky-800"
                      subtitleColor="text-sky-500"
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
            {/* ESOP Allocation Over Time */}
            <div className="border border-violet-100 ring-1 ring-inset ring-violet-50 rounded-xl p-4 bg-white/95">
              <h6 className="text-sm font-medium text-gray-900 mb-3">ESOP Allocation</h6>
              {(() => {
                const sortedRecords = companyData
                  .filter(d => d.din === director.din)
                  .sort((a, b) => a.year - b.year);
                const hasEsops = sortedRecords.some(r => r.esops && r.esops > 0);
                
                if (!hasEsops) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No ESOP data available
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {sortedRecords.map((record, idx) => {
                      const esops = record.esops || 0;
                      const maxEsops = Math.max(...sortedRecords.map(r => r.esops || 0));
                      const widthPercent = maxEsops > 0 ? (esops / maxEsops) * 100 : 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="w-14 text-xs text-slate-700 font-semibold">{toFY(record.year)}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500 hover:from-purple-600 hover:to-indigo-700 shadow-md"
                                style={{ width: `${widthPercent}%` }}
                              >
                                {esops > 0 && (
                                  <span className="text-[11px] font-bold text-white">
                                    {esops.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {parseCurrencyValue(record.esopValue) > 0 && (
                            <div className="text-xs text-slate-600 ml-16 mt-1">
                              Market Value: <span className="font-bold text-purple-700">{formatCurrencyCompact(parseCurrencyValue(record.esopValue))}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600">Total ESOPs Granted</div>
                      <div className="text-lg font-bold text-teal-700">
                        {sortedRecords.reduce((sum, r) => sum + (r.esops || 0), 0).toLocaleString()}
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

            {/* ESOP Valuation Trend */}
            <div className="lg:col-span-2">
              <EsopValueChart series={esopSeries} />
            </div>

            {/* Tenure Timeline */}
            <div className="border border-teal-100 ring-1 ring-inset ring-teal-50 rounded-xl p-6 lg:col-span-2 bg-white shadow-sm hover:shadow-md transition-all duration-300">
              <h6 className="text-base font-bold text-teal-800 mb-4">Tenure & Designation Timeline</h6>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-teal-300"></div>
                
                <div className="space-y-4">
                  {records.map((record, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-teal-600 rounded-full text-white text-xs font-bold flex-shrink-0">
                        {toFY(record.year)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 bg-teal-50 rounded-lg p-3 border border-teal-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{record.designation}</div>
                            <div className="text-xs text-gray-600 mt-1">Compensation: <span className="font-semibold text-teal-700">{record.compensation}</span></div>
                            {record.esops && record.esops > 0 && (
                              <div className="text-xs text-gray-600 mt-1">ESOPs: <span className="font-semibold text-teal-700">{record.esops.toLocaleString()}</span></div>
                            )}
                          </div>
                          {idx === 0 && (
                            <span className="px-2 py-1 bg-teal-600 text-white text-[10px] font-semibold rounded">LATEST (FY25)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
