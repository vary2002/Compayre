import React, { useState } from "react";
import { formatCurrencyCompact } from "@/utils/currency";

interface StackedBarChartProps {
  data: Array<{
    year: number;
    salary: number;
    retirement: number;
    perquisites: number;
    bonus: number;
    payExclEsops: number;
    esops: number;
  }>;
}

// Refined teal palette (mid-range, not too dark/light)
const COLORS = [
  "#0E7490", // Teal-700
  "#0891B2", // Teal-600
  "#06B6D4", // Teal-500
  "#22D3EE", // Teal-400
  "#67E8F9", // Teal-300
  "#A5F3FC", // Teal-200
];

const LABELS = [
  "Salary",
  "Retirement",
  "Perquisites",
  "Bonus",
  "Pay (Excl ESOPs)",
  "ESOPS",
];

export function StackedBarChart({ data }: StackedBarChartProps) {
  const [hover, setHover] = useState<{ year: number; idx: number; value: number; x: number; y: number } | null>(null);
  
  if (!data.length) return null;
  
  const maxTotal = Math.max(
    ...data.map(d => d.salary + d.retirement + d.perquisites + d.bonus + d.payExclEsops + d.esops)
  );
  const barWidth = 56;
  const barGap = 48;
  const chartHeight = 280;
  const topPad = 60;
  const bottomPad = 140;
  const leftPad = 70;
  const rightPad = 30;
  const chartWidth = data.length * (barWidth + barGap) + leftPad + rightPad;

  return (
    <div className="relative bg-gradient-to-br from-slate-50 via-white to-white shadow-xl p-12" style={{ minWidth: 900 }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
         
          <h3 className="text-2xl font-bold text-slate-900">
            Compensation Breakdown
          </h3>
        </div>
        <p className="text-sm text-slate-600">Comprehensive year-over-year analysis of total compensation structure</p>
      </div>
      
      {/* Chart Container */}
      <div className="relative bg-gradient-to-br from-slate-50 via-white to-white rounded-2xl p-10" style={{ minWidth: 900 }}>
        <div className="overflow-x-auto pb-4">
          <div style={{ position: 'relative', width: chartWidth, height: topPad + chartHeight + bottomPad }}>
            <svg width={chartWidth} height={topPad + chartHeight + bottomPad}>
              {/* Y axis lines and labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const yPos = topPad + chartHeight * (1 - p);
                return (
                  <g key={i}>
                    <line
                      x1={leftPad}
                      x2={chartWidth - rightPad}
                      y1={yPos}
                      y2={yPos}
                      stroke={p === 0 ? "#94A3B8" : "#E2E8F0"}
                      strokeWidth={p === 0 ? 2 : 1}
                      strokeDasharray={p === 0 ? "0" : "4 4"}
                      opacity={p === 0 ? 0.8 : 0.6}
                    />
                    <text
                      x={leftPad - 14}
                      y={yPos + 5}
                      fontSize={13}
                      fill="#475569"
                      textAnchor="end"
                      fontWeight={600}
                    >
                      {formatCurrencyCompact(maxTotal * p)}
                    </text>
                  </g>
                );
              })}
              
              {/* Bars */}
              {data.map((d, barIndex) => {
                const values = [d.salary, d.retirement, d.perquisites, d.bonus, d.payExclEsops, d.esops];
                const total = values.reduce((sum, v) => sum + v, 0);
                const xPos = leftPad + barIndex * (barWidth + barGap);
                let cumulativeHeight = 0;
                
                return (
                  <g key={d.year}>
                    {/* Stacked segments */}
                    {values.map((val, segmentIndex) => {
                      if (val <= 0) return null;
                      
                      const segmentHeight = (val / maxTotal) * chartHeight;
                      const yPos = topPad + chartHeight - cumulativeHeight - segmentHeight;
                      cumulativeHeight += segmentHeight;
                      
                      const isHovered = hover?.year === d.year && hover?.idx === segmentIndex;
                      
                      return (
                        <rect
                          key={segmentIndex}
                          x={xPos}
                          y={yPos}
                          width={barWidth}
                          height={segmentHeight}
                          fill={COLORS[segmentIndex]}
                          opacity={isHovered ? 1 : 0.95}
                          style={{
                            cursor: 'pointer',
                            filter: isHovered ? 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={() => {
                            setHover({
                              year: d.year,
                              idx: segmentIndex,
                              value: val,
                              x: xPos + barWidth / 2,
                              y: yPos
                            });
                          }}
                          onMouseLeave={() => setHover(null)}
                        />
                      );
                    })}
                    
                    {/* Total label on top with background */}
                    <rect
                      x={xPos + barWidth / 2 - 32}
                      y={topPad + chartHeight - cumulativeHeight - 26}
                      width={64}
                      height={20}
                      fill="white"
                      rx={10}
                      opacity={0.95}
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                    <text
                      x={xPos + barWidth / 2}
                      y={topPad + chartHeight - cumulativeHeight - 12}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#0F172A"
                      fontWeight={700}
                    >
                      {formatCurrencyCompact(total)}
                    </text>
                    
                    {/* Year label with styling */}
                    <circle
                      cx={xPos + barWidth / 2}
                      cy={topPad + chartHeight + 16}
                      r={4}
                      fill="#94A3B8"
                    />
                    <text
                      x={xPos + barWidth / 2}
                      y={topPad + chartHeight + 36}
                      textAnchor="middle"
                      fontSize={15}
                      fill="#475569"
                      fontWeight={700}
                    >
                      {d.year}
                    </text>
                  </g>
                );
              })}
              
              {/* Legend */}
              <g transform={`translate(${leftPad}, ${topPad + chartHeight + 60})`}>
                <rect
                  x={-10}
                  y={-10}
                  width={chartWidth - leftPad - rightPad + 20}
                  height={80}
                  fill="white"
                  rx={12}
                  opacity={0.8}
                />
                {LABELS.map((label, i) => {
                  const xPos = (i % 2) * 300;
                  const yPos = Math.floor(i / 2) * 28 + 5;
                  
                  return (
                    <g key={label} transform={`translate(${xPos}, ${yPos})`}>
                      <rect 
                        x={0} 
                        y={0} 
                        width={18} 
                        height={18} 
                        fill={COLORS[i]} 
                        rx={4}
                      />
                      <text 
                        x={26} 
                        y={13} 
                        fontSize={14} 
                        fill="#334155"
                        fontWeight={500}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            
            {/* Tooltip as HTML overlay */}
            {hover && (
              <div
                style={{
                  position: 'absolute',
                  left: hover.x - 75,
                  top: Math.max(10, hover.y - 60),
                  pointerEvents: 'none',
                  zIndex: 1000
                }}
              >
                <div className="bg-slate-900 rounded-xl px-4 py-2.5 shadow-2xl border border-slate-700">
                  <div className="text-xs font-semibold text-slate-300 whitespace-nowrap mb-1">
                    {LABELS[hover.idx]}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrencyCompact(hover.value)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer stats */}

      {/* You can add footer stats here if needed */}
    </div>
  );
}
