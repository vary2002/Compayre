// src/components/DirectorTable.tsx
"use client";

import { Filter } from "lucide-react";
import { formatCurrencyCompact } from "@/utils/currency";

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

interface FilterDropdownProps {
  options: string[];
  onSelectionChange: (value: string | number | (string | number)[] | null) => void;
  hasActiveFilter: boolean;
}

interface DirectorTableProps {
  data: DirectorInfo[];
  uniqueNames: string[];
  uniqueDins: string[];
  uniqueDesignations: string[];
  nameFilter: (string | number)[] | null;
  dinFilter: (string | number)[] | null;
  designationFilter: (string | number)[] | null;
  compensationSort: 'asc' | 'desc' | null;
  onNameFilterChange: (value: string | number | (string | number)[] | null) => void;
  onDinFilterChange: (value: string | number | (string | number)[] | null) => void;
  onDesignationFilterChange: (value: string | number | (string | number)[] | null) => void;
  onCompensationSortToggle: () => void;
  onDirectorClick: (name: string, din: string) => void;
  FilterDropdown: React.ComponentType<FilterDropdownProps>;
}

export default function DirectorTable({
  data,
  uniqueNames,
  uniqueDins,
  uniqueDesignations,
  nameFilter,
  dinFilter,
  designationFilter,
  compensationSort,
  onNameFilterChange,
  onDinFilterChange,
  onDesignationFilterChange,
  onCompensationSortToggle,
  onDirectorClick,
  FilterDropdown,
}: DirectorTableProps) {
  const formatCompensation = (value: string) => {
    const numeric = parseInt(value.replace(/[₹,]/g, ""), 10);
    return formatCurrencyCompact(Number.isFinite(numeric) ? numeric : 0);
  };

  return (
    <div className="overflow-x-auto overflow-y-auto min-h-[480px] max-h-[480px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="w-1/3 px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span>Name</span>
                <FilterDropdown
                  options={uniqueNames}
                  onSelectionChange={onNameFilterChange}
                  hasActiveFilter={nameFilter !== null && Array.isArray(nameFilter) && nameFilter.length > 0}
                />
              </div>
            </th>
            <th className="w-1/3 px-6 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span>DIN</span>
                <FilterDropdown
                  options={uniqueDins}
                  onSelectionChange={onDinFilterChange}
                  hasActiveFilter={dinFilter !== null && Array.isArray(dinFilter) && dinFilter.length > 0}
                />
              </div>
            </th>
            <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
              <button
                onClick={onCompensationSortToggle}
                className="flex items-center gap-1 hover:text-gray-900"
              >
                Compensation
                {compensationSort === 'asc' && <span>↑</span>}
                {compensationSort === 'desc' && <span>↓</span>}
                {!compensationSort && <span className="text-gray-400">↕</span>}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                No executive directors match the selected filters
              </td>
            </tr>
          ) : (
            data.map((director, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                  onClick={() => onDirectorClick(director.name, director.din)}
                >
                  {director.name}
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline font-mono"
                  onClick={() => onDirectorClick(director.name, director.din)}
                >
                  {director.din}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCompensation(director.compensation)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
