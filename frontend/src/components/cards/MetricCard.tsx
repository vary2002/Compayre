// src/components/MetricCard.tsx
"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
  labelColor?: string;
  subtitleColor?: string;
}

export default function MetricCard({
  label,
  value,
  subtitle,
  valueColor = "text-gray-900",
  labelColor = "text-gray-600",
  subtitleColor = "text-gray-500",
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className={`text-xs mb-1 font-semibold ${labelColor}`}>{label}</div>
      <div className={`text-xl font-semibold ${valueColor}`}>{value}</div>
      {subtitle && <div className={`text-xs mt-1 ${subtitleColor}`}>{subtitle}</div>}
    </div>
  );
}
