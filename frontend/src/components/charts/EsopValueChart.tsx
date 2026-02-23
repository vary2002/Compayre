"use client";

import { useState } from "react";
import { buildNiceTicks } from "@/utils/chart";
import { formatCurrencyAxisTick, formatCurrencyRaw } from "@/utils/currency";
import { EsopSeriesPoint } from "@/utils/esop";

interface EsopValueChartProps {
  series: EsopSeriesPoint[];
}

export default function EsopValueChart({ series }: EsopValueChartProps) {
  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        ESOP valuation data is unavailable for the selected director.
      </div>
    );
  }

  const maxValue = Math.max(...series.map(point => Math.max(point.fairValue, point.marketValue)));
  if (maxValue <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        ESOP valuation data is unavailable for the selected director.
      </div>
    );
  }

  const svgWidth = 200;
  const svgHeight = 90;
  const chartPadding = { top: 5, right: 34, bottom: 24, left: 40 };
  const plotWidth = svgWidth - chartPadding.left - chartPadding.right;
  const plotHeight = svgHeight - chartPadding.top - chartPadding.bottom;
  const xBand = plotWidth / Math.max(series.length, 1);
  const getX = (index: number) => chartPadding.left + xBand * index + xBand / 2;
  const barWidth = Math.min(44, xBand * 0.6);

  const yTickValues = buildNiceTicks(maxValue, 5);
  const yScaleMax = yTickValues[yTickValues.length - 1] || maxValue || 1;
  const getY = (value: number) =>
    chartPadding.top + (1 - Math.min(value, yScaleMax) / yScaleMax) * plotHeight;

  const linePoints = series
    .map((point, index) => `${getX(index)},${getY(point.marketValue)}`)
    .join(" ");

  const [hovered, setHovered] = useState<{
    year: number;
    fairValue: number;
    marketValue: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);

  const showTooltip = (point: EsopSeriesPoint, x: number, y: number) => {
    setHovered({
      year: point.year,
      fairValue: point.fairValue,
      marketValue: point.marketValue,
      xPercent: (x / svgWidth) * 120,
      yPercent: (y / svgHeight) * 120,
    });
  };

  const hideTooltip = () => setHovered(null);

  return (
    <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">ESOP Valuation Trend</h3>
        <div className="flex items-center gap-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fair vs Market</span>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="h-4 w-7 rounded-sm bg-sky-400"></span>
              <span>Fair value (bars)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-indigo-500"></span>
              <span>Market value (line)</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <div className="relative w-full" style={{ aspectRatio: "3 / 1" }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="absolute inset-0 h-full w-full">
            <line
              x1={chartPadding.left}
              y1={chartPadding.top}
              x2={chartPadding.left}
              y2={svgHeight - chartPadding.bottom}
              stroke="#CBD5F5"
              strokeWidth={0.6}
            />
            <line
              x1={chartPadding.left}
              y1={svgHeight - chartPadding.bottom}
              x2={svgWidth - chartPadding.right}
              y2={svgHeight - chartPadding.bottom}
              stroke="#CBD5F5"
              strokeWidth={0.6}
            />

            {yTickValues.map((tickValue, idx) => {
              const y = getY(tickValue);
              return (
                <g key={`esop-y-${idx}`}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={svgWidth - chartPadding.right}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth={0.6}
                  />
                  <text
                    x={chartPadding.left - 8}
                    y={y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fontSize={4}
                    fill="#6B7280"
                  >
                    {formatCurrencyAxisTick(tickValue)}
                  </text>
                </g>
              );
            })}

            {series.map((point, index) => {
              const x = getX(index);
              return (
                <g key={`esop-x-${point.year}-${index}`}>
                  <line
                    x1={x}
                    y1={chartPadding.top}
                    x2={x}
                    y2={svgHeight - chartPadding.bottom}
                    stroke="#F3F4F6"
                    strokeWidth={0.6}
                  />
                  <text
                    x={x}
                    y={svgHeight - chartPadding.bottom + 5}
                    textAnchor="middle"
                    alignmentBaseline="hanging"
                    fontSize={4}
                    fill="#6B7280"
                  >
                    FY{point.year.toString().slice(-2)}
                  </text>
                </g>
              );
            })}

            {series.map((point, index) => {
              const centerX = getX(index);
              const barX = centerX - barWidth / 2;
              const barTop = getY(point.fairValue);
              const barHeight = Math.max(chartPadding.top + plotHeight - barTop, 0);
              const markerY = getY(point.marketValue);
              const tooltipY = Math.min(markerY, barTop);

              return (
                <g
                  key={`esop-bar-${point.year}-${index}`}
                  onMouseEnter={() => showTooltip(point, centerX, tooltipY)}
                  onMouseLeave={hideTooltip}
                  onFocus={() => showTooltip(point, centerX, tooltipY)}
                  onBlur={hideTooltip}
                  role="presentation"
                >
                  <rect
                    x={barX}
                    y={barTop}
                    width={barWidth}
                    height={barHeight}
                    fill="#38BDF8"
                    fillOpacity={0.7}
                    rx={4}
                  >
                    <title>{`FY ${point.year} • Fair Value ${formatCurrencyRaw(point.fairValue)}`}</title>
                  </rect>
                  <circle
                    cx={centerX}
                    cy={markerY}
                    r={4}
                    fill="#8B5CF6"
                    stroke="#F8FAFC"
                    strokeWidth={1.5}
                    tabIndex={0}
                    aria-label={`FY ${point.year} market value ${formatCurrencyRaw(point.marketValue)}`}
                  />
                </g>
              );
            })}

            <polyline
              points={linePoints}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </svg>
          {hovered && (
            <div
              className="pointer-events-none absolute z-10 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
              style={{
                left: `${Math.min(Math.max(hovered.xPercent, 10), 90)}%`,
                top: `${Math.min(Math.max(hovered.yPercent, 12), 88)}%`,
                transform: "translate(-50%, -110%)",
              }}
            >
              <div className="text-[10px] uppercase tracking-wide text-gray-300">FY {hovered.year}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-4 rounded-sm bg-sky-400"></span>
                <span>Fair: {formatCurrencyRaw(hovered.fairValue)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                <span>Market: {formatCurrencyRaw(hovered.marketValue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
