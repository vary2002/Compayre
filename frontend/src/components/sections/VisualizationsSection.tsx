// src/components/VisualizationsSection.tsx
"use client";


import type { MouseEvent } from "react";
import { useState, useMemo } from "react";
import PieChart from "../charts/PieChart";
import MetricCard from "../cards/MetricCard";
import { formatCurrencyCompact } from "@/utils/currency";
import { DATASET_LATEST_YEAR } from "@/lib/constants";
import type { PeerCompensationBar } from "@/lib/api";

interface DirectorInfo {
  name: string;
  din: string;
  year: number;
  compensation: string;
  salary?: string;
  bonus?: string;
  perquisites?: string;
  retirementBenefits?: string;
  esopMarketValue?: string;
  totalIncome?: string;
  profitAfterTax?: string;
  returnOnAssets?: string;
  employeeCost?: string;
  salaryToMedianEmployeeRatio?: string;
  peerCompensations?: string[];
  companyMarketCap?: string;
}

// Parse "₹X,XX,XXX Cr" string to raw rupees
const parseCrToRupees = (val?: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/[₹,\s]/g, "");
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return 0;
  if (/cr/i.test(val)) return Math.round(num * 10_000_000);
  if (/lakh/i.test(val)) return Math.round(num * 100_000);
  return num;
};

// Parse "9.0%" → 9.0
const parsePercent = (val?: string): number => {
  if (!val) return 0;
  const num = parseFloat(val.replace(/%/g, "").trim());
  return Number.isFinite(num) ? num : 0;
};

// Parse "₹32,00,000" → 3200000
const parseCompensation = (val?: string): number => {
  if (!val) return 0;
  const num = parseFloat(val.replace(/[₹,]/g, "").trim());
  return Number.isFinite(num) ? num : 0;
};

interface VisualizationsSectionProps {
  toFY: (year: number | undefined | null) => string;
  companyDirectorRecords?: DirectorInfo[];
  companyMarketCap?: string;
  numberOfEmployees?: string;
  peerBars?: PeerCompensationBar[];
  peerFinancialYear?: string;
}

const CRORE_IN_RUPEES = 10_000_000;

export default function VisualizationsSection({ toFY, companyDirectorRecords = [], companyMarketCap, numberOfEmployees, peerBars = [], peerFinancialYear }: VisualizationsSectionProps) {
  const [hoveredSparkPoint, setHoveredSparkPoint] = useState<{
    seriesTitle: string;
    yearLabel: string;
    value: number;
    type: "currency" | "percentage";
    accent: string;
    xPercent: number;
    yPercent: number;
  } | null>(null);
  const [hoveredRemBarIndex, setHoveredRemBarIndex] = useState<number | null>(null);

  // --- Remuneration trend: average compensation per year ---
  const remunerationTrend = useMemo(() => {
    const byYear = new Map<number, number[]>();
    companyDirectorRecords.forEach(r => {
      const val = parseCompensation(r.compensation);
      if (val > 0) {
        const arr = byYear.get(r.year) ?? [];
        arr.push(val);
        byYear.set(r.year, arr);
      }
    });
    const entries = Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, vals]) => ({ year, amountRupees: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }));
    if (entries.length === 0) {
      return [
        { year: DATASET_LATEST_YEAR - 4, amountRupees: 2.5 * CRORE_IN_RUPEES, heightPx: 110 },
        { year: DATASET_LATEST_YEAR - 3, amountRupees: 2.8 * CRORE_IN_RUPEES, heightPx: 130 },
        { year: DATASET_LATEST_YEAR - 2, amountRupees: 2.6 * CRORE_IN_RUPEES, heightPx: 120 },
        { year: DATASET_LATEST_YEAR - 1, amountRupees: 3.5 * CRORE_IN_RUPEES, heightPx: 160 },
        { year: DATASET_LATEST_YEAR,     amountRupees: 3.8 * CRORE_IN_RUPEES, heightPx: 180 },
      ];
    }
    const maxAmount = Math.max(...entries.map(e => e.amountRupees));
    return entries.map(e => ({
      ...e,
      heightPx: maxAmount === 0 ? 40 : Math.max(40, Math.round((e.amountRupees / maxAmount) * 180)),
    }));
  }, [companyDirectorRecords]);

  const performanceYears = remunerationTrend.map(r => r.year);
  const latestDisplayYear = performanceYears.length > 0 ? performanceYears[performanceYears.length - 1] : DATASET_LATEST_YEAR;

  // --- Remuneration components: breakdown from latest year's records ---
  const { remunerationComponents, totalRemunerationAmount } = useMemo(() => {
    const latestYear = Math.max(...companyDirectorRecords.map(r => r.year), 0);
    const latestRecords = companyDirectorRecords.filter(r => r.year === latestYear);
    const fallback = [
      { label: "Basic Salary", share: 40, amountRupees: 15_200_000, color: "#3B82F6" },
      { label: "Bonus/Commission", share: 25, amountRupees: 9_500_000, color: "#10B981" },
      { label: "Perquisites/Allowances", share: 20, amountRupees: 7_600_000, color: "#F59E0B" },
      { label: "ESOPs", share: 10, amountRupees: 3_800_000, color: "#8B5CF6" },
      { label: "PF/Retirement", share: 5, amountRupees: 1_900_000, color: "#6B7280" },
    ];
    if (latestRecords.length === 0) return { remunerationComponents: fallback, totalRemunerationAmount: fallback.reduce((s, c) => s + c.amountRupees, 0) };
    const avgField = (get: (r: DirectorInfo) => string | undefined) => {
      const vals = latestRecords.map(r => parseCompensation(get(r))).filter(v => v > 0);
      return vals.length === 0 ? 0 : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    };
    const salary = avgField(r => r.salary);
    const bonus = avgField(r => r.bonus);
    const perquisites = avgField(r => r.perquisites);
    const retirement = avgField(r => r.retirementBenefits);
    const esop = avgField(r => r.esopMarketValue);
    const total = salary + bonus + perquisites + retirement + esop;
    if (total === 0) return { remunerationComponents: fallback, totalRemunerationAmount: fallback.reduce((s, c) => s + c.amountRupees, 0) };
    const raw = [
      { label: "Basic Salary", amountRupees: salary, color: "#3B82F6" },
      { label: "Bonus/Commission", amountRupees: bonus, color: "#10B981" },
      { label: "Perquisites/Allowances", amountRupees: perquisites, color: "#F59E0B" },
      { label: "ESOPs", amountRupees: esop, color: "#8B5CF6" },
      { label: "PF/Retirement", amountRupees: retirement, color: "#6B7280" },
    ].filter(c => c.amountRupees > 0);
    return {
      remunerationComponents: raw.map(c => ({ ...c, share: Math.round((c.amountRupees / total) * 100) })),
      totalRemunerationAmount: total,
    };
  }, [companyDirectorRecords]);

  // --- Performance series: company financials deduplicated by year ---
  const performanceSeries = useMemo(() => {
    const byYear = new Map<number, { totalIncome: number; profitAfterTax: number; returnOnAssets: number; employeeCost: number }>();
    companyDirectorRecords.forEach(r => {
      if (!byYear.has(r.year)) {
        byYear.set(r.year, {
          totalIncome: parseCrToRupees(r.totalIncome),
          profitAfterTax: parseCrToRupees(r.profitAfterTax),
          returnOnAssets: parsePercent(r.returnOnAssets),
          employeeCost: parseCrToRupees(r.employeeCost),
        });
      }
    });
    const sorted = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);
    if (sorted.length === 0) {
      return [
        { title: "Total Income", type: "currency" as const, values: [12500, 13200, 14800, 15600, 17200].map(v => v * CRORE_IN_RUPEES), accent: "#2563EB" },
        { title: "PAT", type: "currency" as const, values: [2100, 2400, 2600, 2900, 3200].map(v => v * CRORE_IN_RUPEES), accent: "#059669" },
        { title: "ROA (%)", type: "percentage" as const, values: [8.5, 9.1, 9.8, 10.2, 10.8], accent: "#7C3AED" },
        { title: "Employee Cost", type: "currency" as const, values: [3200, 3500, 3800, 4100, 4500].map(v => v * CRORE_IN_RUPEES), accent: "#EA580C" },
      ];
    }
    return [
      { title: "Total Income", type: "currency" as const, values: sorted.map(([, d]) => d.totalIncome), accent: "#2563EB" },
      { title: "PAT", type: "currency" as const, values: sorted.map(([, d]) => d.profitAfterTax), accent: "#059669" },
      { title: "ROA (%)", type: "percentage" as const, values: sorted.map(([, d]) => d.returnOnAssets), accent: "#7C3AED" },
      { title: "Employee Cost", type: "currency" as const, values: sorted.map(([, d]) => d.employeeCost), accent: "#EA580C" },
    ];
  }, [companyDirectorRecords]);

  // --- Snapshot metrics ---
  const snapshotMetrics = useMemo(() => {
    const latestYear = Math.max(...companyDirectorRecords.map(r => r.year), 0);
    const latestRecords = companyDirectorRecords.filter(r => r.year === latestYear);
    const prevYear = Math.max(...companyDirectorRecords.filter(r => r.year < latestYear).map(r => r.year), 0);
    const prevRecords = companyDirectorRecords.filter(r => r.year === prevYear);
    const avgComp = latestRecords.length === 0 ? 0 : Math.round(
      latestRecords.map(r => parseCompensation(r.compensation)).reduce((s, v) => s + v, 0) / latestRecords.length
    );
    const prevAvgComp = prevRecords.length === 0 ? 0 : Math.round(
      prevRecords.map(r => parseCompensation(r.compensation)).reduce((s, v) => s + v, 0) / prevRecords.length
    );
    const compYoY = prevAvgComp > 0 ? ((avgComp - prevAvgComp) / prevAvgComp) * 100 : null;
    const medianRatio = latestRecords.find(r => r.salaryToMedianEmployeeRatio)?.salaryToMedianEmployeeRatio ?? null;
    const marketCapRaw = parseCrToRupees(companyMarketCap);
    return [
      {
        label: "Avg Remuneration",
        value: avgComp > 0 ? formatCurrencyCompact(avgComp) : "—",
        subtitle: compYoY !== null ? `${compYoY >= 0 ? "↑" : "↓"} ${Math.abs(compYoY).toFixed(1)}% YoY` : "Latest FY",
        valueColor: "text-emerald-700",
        labelColor: "text-emerald-600",
        subtitleColor: "text-emerald-500",
      },
      {
        label: "Salary to Median Pay",
        value: medianRatio ? `${medianRatio}x` : "—",
        subtitle: "Median employee pay ratio",
        valueColor: "text-amber-700",
        labelColor: "text-amber-600",
        subtitleColor: "text-amber-500",
      },
      {
        label: "Market Cap",
        value: marketCapRaw > 0 ? formatCurrencyCompact(marketCapRaw) : (companyMarketCap ?? "—"),
        subtitle: "Current market capitalisation",
        valueColor: "text-indigo-700",
        labelColor: "text-indigo-600",
        subtitleColor: "text-indigo-500",
      },
      {
        label: "Total Employees",
        value: numberOfEmployees ?? "—",
        subtitle: "Workforce headcount",
        valueColor: "text-teal-700",
        labelColor: "text-teal-600",
        subtitleColor: "text-teal-500",
      },
    ];
  }, [companyDirectorRecords, companyMarketCap, numberOfEmployees]);

  // --- Peer comparison: avg director pay vs peer compensations ---
  const peerComparisonMetrics = useMemo(() => {
    const latestYear = Math.max(...companyDirectorRecords.map(r => r.year), 0);
    const latestRecords = companyDirectorRecords.filter(r => r.year === latestYear);
    const avgComp = latestRecords.length === 0 ? 0 : Math.round(
      latestRecords.map(r => parseCompensation(r.compensation)).reduce((s, v) => s + v, 0) / latestRecords.length
    );
    const peerTotals: number[] = [0, 0, 0, 0, 0];
    let peerRowCount = 0;
    latestRecords.forEach(r => {
      if (r.peerCompensations && r.peerCompensations.length > 0) {
        r.peerCompensations.forEach((p, i) => { if (i < 5) peerTotals[i] += parseCompensation(p); });
        peerRowCount++;
      }
    });
    const peers = peerRowCount > 0 ? peerTotals.map(v => Math.round(v / peerRowCount)) : null;
    if (!peers || avgComp === 0) {
      return [
        { metric: "Avg Remuneration", type: "currency" as const, company: 320_000_000, peer1: 295_000_000, peer2: 308_000_000, peer3: 285_000_000, note: "Company vs peer director compensation" },
        { metric: "Salary to Median Pay", type: "ratio" as const, company: 28, peer1: 24, peer2: 26, peer3: 25, note: "Median employee pay ratio" },
      ];
    }
    return [
      {
        metric: "Avg Remuneration",
        type: "currency" as const,
        company: avgComp,
        peer1: peers[0],
        peer2: peers[1],
        peer3: peers[2],
        note: "Latest FY avg director remuneration vs peer companies",
      },
    ];
  }, [companyDirectorRecords]);

  const peerMetricPalette: Record<"currency" | "percentage" | "ratio", { value: string }> = {
    currency: { value: "text-sky-900" },
    percentage: { value: "text-emerald-800" },
    ratio: { value: "text-amber-800" },
  };

  const formatPeerValue = (value: number, type: "currency" | "percentage" | "ratio") => {
    if (!Number.isFinite(value)) {
      return "—";
    }
    if (type === "currency") {
      return formatCurrencyCompact(value);
    }
    if (type === "percentage") {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(1)}x`;
  };

  const formatPerformanceValue = (value: number, type: "currency" | "percentage") =>
    type === "currency" ? formatCurrencyCompact(value) : `${value.toFixed(1)}%`;

  const computeCagr = (values: number[]) => {
    if (values.length < 2) {
      return null;
    }
    const first = values[0];
    const last = values[values.length - 1];
    if (first <= 0 || last <= 0) {
      return null;
    }
    const periods = values.length - 1;
    const cagr = Math.pow(last / first, 1 / periods) - 1;
    return Number.isFinite(cagr) ? cagr * 100 : null;
  };

  const buildTrendSummary = (series: typeof performanceSeries[number]) => {
    const values = series.values;
    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : null;
    const earliest = values[0];
    const peakValue = Math.max(...values);
    const peakIndex = values.indexOf(peakValue);
    const peakYear = performanceYears[peakIndex] != null ? toFY(performanceYears[peakIndex]) : "—";
    const latestIndex = values.length - 1;
    const latestYear = performanceYears[latestIndex] != null ? toFY(performanceYears[latestIndex]) : "—";
    const peakIsLatest = peakIndex === latestIndex;

    if (series.type === "currency") {
      const cagr = computeCagr(values);
      const yoy = previous && previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : null;

      return {
        latest: {
          primary: formatCurrencyCompact(latest),
          secondary: peakIsLatest ? `${latestYear} · 5y high` : latestYear,
        },
        trend: {
          label: cagr !== null
            ? `${cagr >= 0 ? "↑" : "↓"} ${Math.abs(cagr).toFixed(1)}%`
            : "—",
          helper: "CAGR (5y)",
          direction: cagr === null ? "neutral" : cagr >= 0 ? "up" : "down",
        },
        yoy: {
          label: yoy !== null
            ? `${yoy >= 0 ? "↑" : "↓"} ${Math.abs(yoy).toFixed(1)}%`
            : "—",
          helper: "YoY change",
          direction: yoy === null ? "neutral" : yoy >= 0 ? "up" : "down",
        },
        peak: peakIsLatest
          ? null
          : {
              label: `${peakYear} · ${formatCurrencyCompact(peakValue)}`,
              helper: "Peak value",
            },
        isPeakLatest: peakIsLatest,
      };
    }

    const longTermDelta = latest - earliest;
    const yoyDelta = previous !== null ? latest - previous : null;
    const longTermDirection = longTermDelta === 0 ? "neutral" : longTermDelta > 0 ? "up" : "down";
    const yoyDirection = yoyDelta === null ? "neutral" : yoyDelta > 0 ? "up" : yoyDelta < 0 ? "down" : "neutral";

    return {
      latest: {
        primary: formatPerformanceValue(latest, "percentage"),
        secondary: peakIsLatest ? `${latestYear} · 5y high` : latestYear,
      },
      trend: {
        label: `${longTermDelta >= 0 ? "↑" : "↓"} ${Math.abs(longTermDelta).toFixed(1)} pts`,
        helper: "5y change",
        direction: longTermDirection,
      },
      yoy: {
        label: yoyDelta !== null
          ? `${yoyDelta >= 0 ? "↑" : "↓"} ${Math.abs(yoyDelta).toFixed(1)} pts`
          : "—",
        helper: "YoY change",
        direction: yoyDirection,
      },
      peak: peakIsLatest
        ? null
        : {
            label: `${peakYear} · ${formatPerformanceValue(peakValue, "percentage")}`,
            helper: "Peak value",
          },
      isPeakLatest: peakIsLatest,
    };
  };

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Total Remuneration Trend */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-medium text-gray-600 mb-4">
          Executive Director Remuneration Trend (5 Years)
        </h4>

        <div
          className="relative h-64 flex items-end justify-around gap-2 border-b border-l border-gray-300 pb-2 pl-2"
          onMouseLeave={() => setHoveredRemBarIndex(null)}
        >
          {remunerationTrend.map((data, index) => {
            const yearLabel = toFY(data.year);
            const isHovered = hoveredRemBarIndex === index;

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <span className="text-xs font-semibold text-gray-700 mb-1">
                  {formatCurrencyCompact(data.amountRupees)}
                </span>

                {/* Bar */}
                <div
                  className="relative w-full bg-blue-500 rounded-t cursor-pointer transition-opacity"
                  style={{
                    height: `${data.heightPx}px`,
                    opacity: isHovered ? 0.9 : 1,
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredRemBarIndex(index)}
                  onMouseLeave={() => setHoveredRemBarIndex(null)}
                  onFocus={() => setHoveredRemBarIndex(index)}
                  onBlur={() => setHoveredRemBarIndex(null)}
                  aria-label={`Remuneration ${formatCurrencyCompact(data.amountRupees)} in ${yearLabel}`}
                >
                  {/* Anchored Tooltip */}
                  {isHovered && (
                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-20">
                      <div className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                        <div className="text-[10px] uppercase tracking-wide text-gray-300">
                          Remuneration
                        </div>
                        <div className="mt-0.5 font-semibold">
                          {formatCurrencyCompact(data.amountRupees)}
                        </div>
                        <div className="text-[10px] text-gray-300">{yearLabel}</div>
                      </div>

                      {/* Little caret */}
                      <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>

                <span className="text-xs text-gray-600 mt-2">{yearLabel}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Showing average total remuneration trend over 5 years
        </p>
      </div>


      {/* Remuneration Components Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-medium text-gray-600 mb-4">
          Remuneration Components ({toFY(latestDisplayYear)})
        </h4>
        <PieChart 
          data={remunerationComponents.map(component => ({
            label: component.label,
            value: component.share,
            amount: formatCurrencyCompact(component.amountRupees),
            color: component.color,
          }))}
          totalAmount={formatCurrencyCompact(totalRemunerationAmount)} 
          size="lg"
          showLegend={true}
        />
      </div>

      {/* Key Company Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm lg:col-span-2">
        <h4 className="text-lg font-medium text-gray-600 mb-4">
          Key Company Metrics (5 Years)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {performanceSeries.map(series => {
            const summary = buildTrendSummary(series);
            const maxValue = Math.max(...series.values);
            const minValue = Math.min(...series.values);
            const range = maxValue - minValue;
            const segments = Math.max(series.values.length - 1, 1);
            const directionClass: Record<"up" | "down" | "neutral", string> = {
              up: "text-emerald-600",
              down: "text-rose-600",
              neutral: "text-gray-800",
            };
            const badgeStyles = {
              backgroundColor: `${series.accent}14`,
              borderColor: `${series.accent}33`,
              color: series.accent,
            };
            const badgeLabel = series.type === "currency" ? "₹ metric" : "% metric";
            const sparklineCoords = series.values.map((value, idx) => {
              const x = (idx / segments) * 100;
              const normalized = range === 0 ? 0.5 : (value - minValue) / range;
              const topPadding = 6;
              const bottomPadding = 6;
              const plotHeight = 40 - topPadding - bottomPadding;
              const y = 40 - bottomPadding - normalized * plotHeight;
              return { x, y };
            });
            const sparklinePoints = sparklineCoords.map(point => `${point.x},${point.y}`).join(" ");
            const trendClass = summary.trend.label === "—" ? "text-gray-400" : directionClass[summary.trend.direction as "up" | "down" | "neutral"];
            const yoySummaryClass = summary.yoy.label === "—" ? "text-gray-400" : directionClass[summary.yoy.direction as "up" | "down" | "neutral"];

            return (
              <div
                key={series.title}
                className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-800">{series.title}</div>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={badgeStyles}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">5-year review</div>
                  </div>
                  <div className="inline-flex flex-col items-end gap-0.5 rounded-lg bg-white px-2.5 py-1.5 text-right border border-gray-200">
                    <span className="text-[9px] uppercase tracking-wide text-gray-400">Latest ({toFY(latestDisplayYear)})</span>
                    <span className="text-sm font-semibold text-gray-900">{summary.latest.primary}</span>
                    <span className="text-[10px] text-gray-500">{summary.latest.secondary}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-600">
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Trend</div>
                    <div className={`font-semibold ${trendClass}`}>{summary.trend.label}</div>
                    <div className="text-[9px] text-gray-400">{summary.trend.helper}</div>
                  </div>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">YoY</div>
                    <div className={`font-semibold ${yoySummaryClass}`}>{summary.yoy.label}</div>
                    <div className="text-[9px] text-gray-400">{summary.yoy.helper}</div>
                  </div>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">High watermark</div>
                    {summary.peak ? (
                      <>
                        <div className="font-semibold text-gray-800">{summary.peak.label}</div>
                        <div className="text-[9px] text-gray-400">{summary.peak.helper}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-emerald-600">Current ({toFY(latestDisplayYear)})</div>
                        <div className="text-[9px] text-gray-400">Already at 5y high</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 h-20 relative">
                  <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
                    <polyline
                      fill="none"
                      stroke={series.accent}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints || "0,20"}
                      opacity={0.85}
                    />
                    {sparklineCoords.map((point, idx) => (
                      <circle
                        key={`${series.title}-spark-${idx}`}
                        cx={point.x}
                        cy={point.y}
                        r={idx === series.values.length - 1 ? 2.4 : 1.8}
                        fill={series.accent}
                        opacity={idx === series.values.length - 1 ? 1 : 0.65}
                        tabIndex={0}
                        onMouseEnter={() => {
                          setHoveredSparkPoint({
                            seriesTitle: series.title,
                            yearLabel: toFY(performanceYears[idx] ?? null),
                            value: series.values[idx],
                            type: series.type,
                            accent: series.accent,
                            xPercent: Math.min(Math.max(point.x, 8), 92),
                            yPercent: Math.min(Math.max((point.y / 40) * 100, 10), 88),
                          });
                        }}
                        onMouseLeave={() => setHoveredSparkPoint(prev => (prev?.seriesTitle === series.title ? null : prev))}
                        onFocus={() => {
                          setHoveredSparkPoint({
                            seriesTitle: series.title,
                            yearLabel: toFY(performanceYears[idx] ?? null),
                            value: series.values[idx],
                            type: series.type,
                            accent: series.accent,
                            xPercent: Math.min(Math.max(point.x, 8), 92),
                            yPercent: Math.min(Math.max((point.y / 40) * 100, 10), 88),
                          });
                        }}
                        onBlur={() => setHoveredSparkPoint(prev => (prev?.seriesTitle === series.title ? null : prev))}
                        aria-label={`${series.title} ${formatPerformanceValue(series.values[idx], series.type)} in ${toFY(performanceYears[idx] ?? null)}`}
                      />
                    ))}
                  </svg>
                  {hoveredSparkPoint && hoveredSparkPoint.seriesTitle === series.title && (
                    <div
                      className="pointer-events-none absolute z-10 rounded-md bg-gray-900 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-lg"
                      style={{
                        left: `${hoveredSparkPoint.xPercent}%`,
                        top: `${hoveredSparkPoint.yPercent}%`,
                        transform: "translate(-50%, -130%)",
                      }}
                    >
                      <div className="uppercase tracking-wide text-gray-300" style={{ color: hoveredSparkPoint.accent }}>
                        {hoveredSparkPoint.seriesTitle}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-white">
                        {formatPerformanceValue(hoveredSparkPoint.value, hoveredSparkPoint.type)}
                      </div>
                      <div className="text-[9px] text-gray-300">{hoveredSparkPoint.yearLabel}</div>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  {series.values.map((value, idx) => {
                    const widthPercent = maxValue === 0 ? 0 : (value / (maxValue || 1)) * 100;
                    const isLatest = idx === series.values.length - 1;
                    const previousValue = idx > 0 ? series.values[idx - 1] : null;
                    let yoyLabel = "—";
                    let yoyClass = "text-gray-400";

                    if (previousValue !== null) {
                      if (series.type === "currency" && previousValue !== 0) {
                        const changePercent = ((value - previousValue) / Math.abs(previousValue)) * 100;
                        yoyLabel = `${changePercent >= 0 ? "↑" : "↓"} ${Math.abs(changePercent).toFixed(1)}%`;
                        yoyClass = changePercent > 0 ? "text-emerald-600" : changePercent < 0 ? "text-rose-600" : "text-gray-400";
                      } else if (series.type === "percentage") {
                        const changePts = value - previousValue;
                        yoyLabel = `${changePts >= 0 ? "↑" : "↓"} ${Math.abs(changePts).toFixed(1)} pts`;
                        yoyClass = changePts > 0 ? "text-emerald-600" : changePts < 0 ? "text-rose-600" : "text-gray-400";
                      }
                    }

                    const timelineDotOpacity = series.values.length === 1
                      ? 1
                      : isLatest
                        ? 1
                        : 0.45 + (idx / Math.max(series.values.length - 1, 1)) * 0.4;

                    return (
                      <div key={`${series.title}-${idx}`} className="flex items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-2 w-20">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: series.accent, opacity: timelineDotOpacity }}
                          ></span>
                          <span className="text-gray-500 font-medium">{toFY(performanceYears[idx] ?? null)}</span>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: series.accent,
                              opacity: isLatest ? 1 : 0.6,
                            }}
                          ></div>
                        </div>
                        <span
                          className={`w-20 text-right font-semibold ${isLatest ? "text-gray-900" : "text-gray-600"}`}
                        >
                          {formatPerformanceValue(value, series.type)}
                        </span>
                        <span className={`w-16 text-right font-medium ${yoyClass}`}>{yoyLabel}</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Company Snapshot */}
      <div className="bg-white border border-sky-100 ring-1 ring-inset ring-sky-50 rounded-lg p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 rounded-full">
            Company lens
          </span>
          <h4 className="text-lg font-semibold text-sky-900">
            Company Snapshot
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshotMetrics.map(({ label, value, subtitle, valueColor, labelColor, subtitleColor }) => (
            <MetricCard
              key={label}
              label={label}
              value={value}
              subtitle={subtitle}
              valueColor={valueColor}
              labelColor={labelColor}
              subtitleColor={subtitleColor}
            />
          ))}
        </div>
      </div>

      {/* Peer Compensation Comparison */}
      <div className="bg-white border border-indigo-100 ring-1 ring-inset ring-indigo-50 rounded-lg p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-800 bg-indigo-100 rounded-full">
            Peer lens
          </span>
          <h4 className="text-lg font-semibold text-indigo-900">
            Peer Compensation Comparison
          </h4>
          {peerFinancialYear && (
            <span className="ml-auto text-xs text-gray-400">{peerFinancialYear} · avg director total remuneration</span>
          )}
        </div>
        {peerBars.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Peer compensation data is not available for this company.
          </div>
        ) : (() => {
          const maxComp = Math.max(...peerBars.map(b => b.avg_compensation));
          return (
            <div className="space-y-3">
              {peerBars.map((bar) => {
                const pct = maxComp > 0 ? (bar.avg_compensation / maxComp) * 100 : 0;
                const label = formatCurrencyCompact(bar.avg_compensation);
                return (
                  <div key={bar.name} className="flex items-center gap-3 group">
                    <span
                      className={`w-44 shrink-0 text-xs text-right truncate ${
                        bar.is_subject ? "font-semibold text-indigo-700" : "text-gray-600"
                      }`}
                      title={bar.name}
                    >
                      {bar.name}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-500 ${
                          bar.is_subject ? "bg-indigo-500" : "bg-indigo-200"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`w-24 shrink-0 text-xs ${
                        bar.is_subject ? "font-semibold text-indigo-700" : "text-gray-500"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
