// src/components/VisualizationsSection.tsx
"use client";


import type { MouseEvent } from "react";
import { useState } from "react";
import PieChart from "../charts/PieChart";
import MetricCard from "../cards/MetricCard";
import { formatCurrencyCompact } from "@/utils/currency";

interface VisualizationsSectionProps {
  toFY: (year: number) => string;
}

export default function VisualizationsSection({ toFY }: VisualizationsSectionProps) {
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
  const baseYear = 2019;
  const performanceYears = Array.from({ length: 5 }, (_, idx) => baseYear + idx);
  const CRORE_IN_RUPEES = 10_000_000;
  const remunerationTrend = [
    { year: 1, amountRupees: 2.5 * CRORE_IN_RUPEES, heightPx: 110 },
    { year: 2, amountRupees: 2.8 * CRORE_IN_RUPEES, heightPx: 130 },
    { year: 3, amountRupees: 2.6 * CRORE_IN_RUPEES, heightPx: 120 },
    { year: 4, amountRupees: 3.5 * CRORE_IN_RUPEES, heightPx: 160 },
    { year: 5, amountRupees: 3.8 * CRORE_IN_RUPEES, heightPx: 180 },
  ];

  const remunerationComponents = [
    { label: "Basic Salary", share: 40, amountRupees: 15_200_000, color: "#3B82F6" },
    { label: "Bonus/Commission", share: 25, amountRupees: 9_500_000, color: "#10B981" },
    { label: "Perquisites/Allowances", share: 20, amountRupees: 7_600_000, color: "#F59E0B" },
    { label: "ESOPS", share: 10, amountRupees: 3_800_000, color: "#8B5CF6" },
    { label: "PF/Retirement", share: 5, amountRupees: 1_900_000, color: "#6B7280" },
  ];

  const totalRemunerationAmount = remunerationComponents.reduce((sum, item) => sum + item.amountRupees, 0);

  const performanceSeries = [
    {
      title: "Total Income",
      type: "currency" as const,
      values: [12500, 13200, 14800, 15600, 17200].map(value => value * CRORE_IN_RUPEES),
      accent: "#2563EB",
    },
    {
      title: "PAT",
      type: "currency" as const,
      values: [2100, 2400, 2600, 2900, 3200].map(value => value * CRORE_IN_RUPEES),
      accent: "#059669",
    },
    {
      title: "ROA (%)",
      type: "percentage" as const,
      values: [8.5, 9.1, 9.8, 10.2, 10.8],
      accent: "#7C3AED",
    },
    {
      title: "Employee Cost",
      type: "currency" as const,
      values: [3200, 3500, 3800, 4100, 4500].map(value => value * CRORE_IN_RUPEES),
      accent: "#EA580C",
    },
  ];

  const totalIncomeSeries = performanceSeries.find(series => series.title === "Total Income");

  const snapshotMetrics = [
    {
      label: "Avg Remuneration",
      value: formatCurrencyCompact(320_000_000),
      subtitle: "↑ 12% YoY",
      valueColor: "text-emerald-700",
      labelColor: "text-emerald-600",
      subtitleColor: "text-emerald-500",
    },
    {
      label: "Salary to Median Pay",
      value: "28x",
      subtitle: "Peer median: 24x",
      valueColor: "text-amber-700",
      labelColor: "text-amber-600",
      subtitleColor: "text-amber-500",
    },
    {
      label: "Market Cap",
      value: formatCurrencyCompact(52_000 * CRORE_IN_RUPEES),
      subtitle: "↑ 18% YoY",
      valueColor: "text-indigo-700",
      labelColor: "text-indigo-600",
      subtitleColor: "text-indigo-500",
    },
    {
      label: "Total Employees",
      value: "45,200",
      subtitle: "↑ 8% YoY",
      valueColor: "text-teal-700",
      labelColor: "text-teal-600",
      subtitleColor: "text-teal-500",
    },
  ];

  const peerMetricPalette: Record<"currency" | "percentage" | "ratio", {
    value: string;
  }> = {
    currency: {
      value: "text-sky-900",
    },
    percentage: {
      value: "text-emerald-800",
    },
    ratio: {
      value: "text-amber-800",
    },
  };

  const peerComparisonMetrics = [
    {
      metric: "Avg Remuneration",
      type: "currency" as const,
      company: 320_000_000,
      peer1: 295_000_000,
      peer2: 308_000_000,
      peer3: 285_000_000,
      note: "Company leads peers by ~8%",
    },
    {
      metric: "Salary to Median Pay",
      type: "ratio" as const,
      company: 28,
      peer1: 24,
      peer2: 26,
      peer3: 25,
      note: "Slightly above industry governance threshold",
    },
    {
      metric: "Variable Pay Mix",
      type: "percentage" as const,
      company: 46,
      peer1: 42,
      peer2: 44,
      peer3: 41,
      note: "Higher upside bias vs peers",
    },
    {
      metric: "Equity-aligned Pay",
      type: "currency" as const,
      company: 110_000_000,
      peer1: 95_000_000,
      peer2: 88_000_000,
      peer3: 92_000_000,
      note: "ESOP exposure remains elevated",
    },
  ];

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
    const peakYear = toFY(performanceYears[peakIndex]);
    const latestIndex = values.length - 1;
    const latestYear = toFY(performanceYears[latestIndex]);
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
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Executive Director Remuneration Trend (5 Years)
        </h4>

        <div
          className="relative h-64 flex items-end justify-around gap-2 border-b border-l border-gray-300 pb-2 pl-2"
          onMouseLeave={() => setHoveredRemBarIndex(null)}
        >
          {remunerationTrend.map((data, index) => {
            const yearLabel = toFY(2019 + data.year);
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
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Remuneration Components ({toFY(2024)})
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
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
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
                    <span className="text-[9px] uppercase tracking-wide text-gray-400">Latest (FY25)</span>
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
                        <div className="font-semibold text-emerald-600">Current FY (FY25)</div>
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
                            yearLabel: toFY(performanceYears[idx]),
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
                            yearLabel: toFY(performanceYears[idx]),
                            value: series.values[idx],
                            type: series.type,
                            accent: series.accent,
                            xPercent: Math.min(Math.max(point.x, 8), 92),
                            yPercent: Math.min(Math.max((point.y / 40) * 100, 10), 88),
                          });
                        }}
                        onBlur={() => setHoveredSparkPoint(prev => (prev?.seriesTitle === series.title ? null : prev))}
                        aria-label={`${series.title} ${formatPerformanceValue(series.values[idx], series.type)} in ${toFY(performanceYears[idx])}`}
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
                          <span className="text-gray-500 font-medium">{toFY(performanceYears[idx])}</span>
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

                {series.title === "Employee Cost" && totalIncomeSeries && (
                  (() => {
                    const latestCost = series.values[series.values.length - 1];
                    const previousCost = series.values.length > 1 ? series.values[series.values.length - 2] : null;
                    const latestIncome = totalIncomeSeries.values[totalIncomeSeries.values.length - 1];
                    const previousIncome = totalIncomeSeries.values.length > 1
                      ? totalIncomeSeries.values[totalIncomeSeries.values.length - 2]
                      : null;
                    const costRatio = latestIncome ? (latestCost / latestIncome) * 100 : null;
                    const previousRatio = previousIncome ? ((previousCost ?? 0) / previousIncome) * 100 : null;
                    const ratioDelta = costRatio !== null && previousRatio !== null
                      ? costRatio - previousRatio
                      : null;

                    if (costRatio === null) {
                      return null;
                    }

                    return (
                      <div className="mt-3 rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] text-orange-700">
                        <span className="font-semibold text-orange-800">Cost intensity:</span>{" "}
                        {costRatio.toFixed(1)}% of income (FY25)
                        {ratioDelta !== null && (
                          <span className="ml-1 font-medium">
                            ({ratioDelta >= 0 ? "↑" : "↓"} {Math.abs(ratioDelta).toFixed(1)} pts YoY)
                          </span>
                        )}
                      </div>
                    );
                  })()
                )}
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
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-indigo-600">
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2 px-4 text-indigo-700">Company</th>
                <th className="py-2 px-4 text-indigo-700">Peer 1</th>
                <th className="py-2 px-4 text-indigo-700">Peer 2</th>
                <th className="py-2 px-4 text-indigo-700">Peer 3</th>
                <th className="py-2 pl-4 text-indigo-700">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {peerComparisonMetrics.map((row, idx) => (
                <tr key={`${row.metric}-${idx}`} className="align-top">
                  {(() => {
                    const palette = peerMetricPalette[row.type];
                    return (
                      <>
                        <td className="py-3 pr-4 font-semibold text-indigo-700">{row.metric}</td>
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${palette.value}`}>{formatPeerValue(row.company, row.type)}</div>
                          <div className="text-xs text-emerald-600">Baseline</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatPeerValue(row.peer1, row.type)}</td>
                        <td className="py-3 px-4 text-slate-600">{formatPeerValue(row.peer2, row.type)}</td>
                        <td className="py-3 px-4 text-slate-600">{formatPeerValue(row.peer3, row.type)}</td>
                        <td className="py-3 pl-4 text-xs text-indigo-600 w-48">{row.note}</td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
