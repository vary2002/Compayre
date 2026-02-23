// src/components/PieChart.tsx
"use client";

import { useMemo, useState } from "react";

interface PieChartData {
  label: string;
  value: number; // percentage used to create the pie
  amount: string;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  totalAmount: string;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}

type HoveredSlice = {
  label: string;
  value: number;
  amount: string;
  color: string;
};

export default function PieChart({
  data,
  totalAmount,
  size = "md",
  showLegend = true,
}: PieChartProps) {
  const [hovered, setHovered] = useState<HoveredSlice | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const pieData = useMemo(() => {
    let currentAngle = 0;
    return data.map((component) => {
      const angle = (component.value / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        ...component,
        startAngle,
        endAngle: currentAngle,
      };
    });
  }, [data]);

  const sizeClasses = {
    sm: { container: "w-40 h-40", center: "w-16 h-16", text: "text-xs", amount: "text-sm" },
    md: { container: "w-48 h-48", center: "w-20 h-20", text: "text-xs", amount: "text-sm" },
    lg: { container: "w-56 h-56", center: "w-24 h-24", text: "text-xs", amount: "text-base" },
  };

  const sizes = sizeClasses[size];

  const formatPercentage = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "0.00");

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Position tooltip relative to the chart container
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleLeaveChart = () => {
    setHovered(null);
    setTooltipPos(null);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Pie Chart */}
      <div
        className={`relative ${sizes.container} mb-3`}
        onMouseMove={hovered ? handleMove : undefined}
        onMouseLeave={handleLeaveChart}
      >
        <svg viewBox="0 0 200 200" className="transform -rotate-90">
          {pieData.map((slice, idx) => {
            const startAngle = (slice.startAngle * Math.PI) / 180;
            const endAngle = (slice.endAngle * Math.PI) / 180;
            const radius = 85;
            const centerX = 100;
            const centerY = 100;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={idx}
                d={pathData}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                style={{
                  opacity: hovered?.label === slice.label ? 0.9 : 1,
                }}
                onMouseEnter={() => {
                  setHovered({
                    label: slice.label,
                    value: slice.value,
                    amount: slice.amount,
                    color: slice.color,
                  });
                }}
              />
            );
          })}
        </svg>

        {/* Center circle for donut effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`${sizes.center} bg-white rounded-full flex items-center justify-center shadow-inner`}>
            <div className="text-center">
              <div className={`${sizes.text} text-gray-600`}>Total</div>
              <div className={`${sizes.amount} font-bold text-gray-900`}>{totalAmount}</div>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hovered && tooltipPos && (
          <div
            className="absolute z-20 px-3 py-2 rounded-md shadow-lg bg-gray-900 text-white text-xs pointer-events-none"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y + 12,
              maxWidth: 220,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hovered.color }} />
              <span className="font-semibold">{hovered.label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Value</span>
              <span className="font-semibold">{formatPercentage(hovered.value)}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Amount</span>
              <span className="font-semibold">{hovered.amount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="w-full space-y-1.5">
          {pieData.map((slice, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs"
              onMouseEnter={() =>
                setHovered({
                  label: slice.label,
                  value: slice.value,
                  amount: slice.amount,
                  color: slice.color,
                })
              }
              onMouseLeave={handleLeaveChart}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                ></div>
                <span className="text-gray-700">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{formatPercentage(slice.value)}%</span>
                <span className="font-semibold text-gray-900 w-14 text-right">{slice.amount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
