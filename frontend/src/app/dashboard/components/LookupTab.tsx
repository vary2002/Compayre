"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Dropdown from "@/components/Dropdown";
import CompanyInfoCard from "@/components/CompanyInfoCard";
import DirectorTable from "@/components/DirectorTable";
import DirectorDetailsSection from "@/components/DirectorDetailsSection";
import VisualizationsSection from "@/components/VisualizationsSection";
import { formatCurrencyCompact } from "@/utils/currency";
import FilterDropdown from "./FilterDropdown";
import {
  DirectorInfo,
  companyInfo,
  companyDataMap,
  directorAllCompaniesData,
} from "../data";

const toFY = (year: number): string => `FY${year.toString().slice(-2)}`;

const companyOptions = [
  { id: 1, label: "Reliance Industries Ltd\nNSE: RELIANCE", value: "Reliance Industries Ltd" },
  { id: 2, label: "Tata Consultancy Services\nNSE: TCS", value: "Tata Consultancy Services" },
  { id: 3, label: "Infosys Ltd\nNSE: INFY", value: "Infosys Ltd" },
  { id: 4, label: "HDFC Bank Ltd\nNSE: HDFCBANK", value: "HDFC Bank Ltd" },
  { id: 5, label: "ICICI Bank Ltd\nNSE: ICICIBANK", value: "ICICI Bank Ltd" },
];

const parseCompensationValue = (value?: string) => {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/[₹,]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const directorPiePalette = [
  "#6366F1",
  "#0EA5E9",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#22D3EE",
];



export default function LookupTab() {
  const [selectedCompany, setSelectedCompany] = useState<string | number | (string | number)[] | null>(null);
  const [nameFilter, setNameFilter] = useState<(string | number)[] | null>(null);
  const [dinFilter, setDinFilter] = useState<(string | number)[] | null>(null);
  const [designationFilter, setDesignationFilter] = useState<(string | number)[] | null>(null);
  const [compensationSort, setCompensationSort] = useState<"asc" | "desc" | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<DirectorInfo | null>(null);


  const selectedCompanyData: DirectorInfo[] = useMemo(() => {
    if (!selectedCompany || typeof selectedCompany !== "string") {
      return [];
    }
    return companyDataMap[selectedCompany] ?? [];
  }, [selectedCompany]);

  // When company changes, close director details if director is not in the new company
  useEffect(() => {
    if (selectedDirector && selectedCompanyData.length > 0) {
      const found = selectedCompanyData.some(d => d.din === selectedDirector.din);
      if (!found) {
        setSelectedDirector(null);
      }
    }
  }, [selectedCompany, selectedDirector, selectedCompanyData]);
  // When company changes, close director details if director is not in the new company
  useEffect(() => {
    if (selectedDirector && selectedCompanyData.length > 0) {
      const found = selectedCompanyData.some(d => d.din === selectedDirector.din);
      if (!found) {
        setSelectedDirector(null);
      }
    }
  }, [selectedCompany, selectedDirector, selectedCompanyData]);

  // Restore persisted state after mount to ensure UI updates
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCompany = localStorage.getItem("dashboard_selectedCompany");
      if (storedCompany) {
        setSelectedCompany(JSON.parse(storedCompany));
      }
      const storedDirector = localStorage.getItem("dashboard_selectedDirector");
      if (storedDirector) {
        setSelectedDirector(JSON.parse(storedDirector));
      }
    }
  }, []);
  const directorDetailsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  useEffect(() => {
    if (selectedCompany !== null && selectedCompany !== undefined) {
      localStorage.setItem("dashboard_selectedCompany", JSON.stringify(selectedCompany));
    } else {
      localStorage.removeItem("dashboard_selectedCompany");
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedDirector !== null && selectedDirector !== undefined) {
      localStorage.setItem("dashboard_selectedDirector", JSON.stringify(selectedDirector));
    } else {
      localStorage.removeItem("dashboard_selectedDirector");
    }
  }, [selectedDirector]);

  const latestCompanyYear = useMemo(() => {
    if (selectedCompanyData.length === 0) {
      return null;
    }
    return Math.max(...selectedCompanyData.map(record => record.year));
  }, [selectedCompanyData]);

  const uniqueDirectors = useMemo(() => {
    const map = new Map<string, DirectorInfo>();

    selectedCompanyData.forEach(director => {
      const existing = map.get(director.din);
      if (!existing || director.year > existing.year) {
        map.set(director.din, director);
      }
    });

    return Array.from(map.values());
  }, [selectedCompanyData]);

  const directorRemunerationSummary = useMemo(() => {
    if (uniqueDirectors.length === 0) {
      return null;
    }

    const slices = uniqueDirectors
      .map((director, index) => {
        const amountValue = parseCompensationValue(director.compensation);
        return {
          label: director.name,
          amountValue,
          color: directorPiePalette[index % directorPiePalette.length],
          year: director.year,
        };
      })
      .filter(slice => slice.amountValue > 0);

    if (slices.length === 0) {
      return null;
    }

    const total = slices.reduce((sum, slice) => sum + slice.amountValue, 0);
    if (total <= 0) {
      return null;
    }

    const latestYear = Math.max(...slices.map(slice => slice.year));

    return {
      fiscalYear: toFY(latestYear),
      totalAmount: formatCurrencyCompact(total),
      chartData: slices.map(slice => ({
        label: slice.label,
        value: Number(((slice.amountValue / total) * 100).toFixed(2)),
        amount: formatCurrencyCompact(slice.amountValue),
        color: slice.color,
      })),
    };
  }, [uniqueDirectors]);

  const uniqueNames = useMemo(() => Array.from(new Set(selectedCompanyData.map(d => d.name))).sort(), [selectedCompanyData]);
  const uniqueDins = useMemo(() => Array.from(new Set(selectedCompanyData.map(d => d.din))).sort(), [selectedCompanyData]);
  const uniqueDesignations = useMemo(
    () => Array.from(new Set(selectedCompanyData.map(d => d.designation))).sort(),
    [selectedCompanyData],
  );

  const filteredAndSortedData = useMemo(() => {
    return uniqueDirectors
      .filter(director => {
        if (nameFilter && Array.isArray(nameFilter) && nameFilter.length > 0 && !nameFilter.includes(director.name)) {
          return false;
        }
        if (dinFilter && Array.isArray(dinFilter) && dinFilter.length > 0 && !dinFilter.includes(director.din)) {
          return false;
        }
        if (
          designationFilter &&
          Array.isArray(designationFilter) &&
          designationFilter.length > 0 &&
          !designationFilter.includes(director.designation)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (compensationSort) {
          const aComp = parseCompensationValue(a.compensation);
          const bComp = parseCompensationValue(b.compensation);

          if (compensationSort === "asc") {
            return aComp - bComp;
          }
          if (compensationSort === "desc") {
            return bComp - aComp;
          }
        }
        return 0;
      });
  }, [uniqueDirectors, nameFilter, dinFilter, designationFilter, compensationSort]);

  const handleDirectorClick = (name: string, din: string) => {
    // Find the full DirectorInfo object from selectedCompanyData
    const fullDirector = selectedCompanyData.find(
      (d) => d.name === name && d.din === din
    );
    if (fullDirector) {
      setSelectedDirector(fullDirector);
      setTimeout(() => {
        directorDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleToggleCompensationSort = () => {
    setCompensationSort(prev => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Executive Director Compensation Analytics</h2>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">Select Company</label>
        <div className="max-w-md">
          <Dropdown
            options={companyOptions}
            placeholder="Select a company..."
            isMultiSelect={false}
            isSearchable
            onSelectionChange={setSelectedCompany}
            value={selectedCompany}
            showSelectAll={false}
            showReset={false}
          />
        </div>
      </div>

      {selectedCompany && typeof selectedCompany === "string" && companyInfo[selectedCompany] && (
        <CompanyInfoCard
          companyInfo={companyInfo[selectedCompany]}
          fiscalYear={directorRemunerationSummary?.fiscalYear ?? (latestCompanyYear ? toFY(latestCompanyYear) : toFY(2025))}
          remunerationData={directorRemunerationSummary?.chartData ?? []}
          totalRemuneration={directorRemunerationSummary?.totalAmount ?? formatCurrencyCompact(0)}
        />
      )}

      {selectedCompany && selectedCompanyData.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Executive Directors at {typeof selectedCompany === "string" ? selectedCompany : "Selected Company"}
          </h3>

          <DirectorTable
            data={filteredAndSortedData}
            uniqueNames={uniqueNames}
            uniqueDins={uniqueDins}
            uniqueDesignations={uniqueDesignations}
            nameFilter={nameFilter}
            dinFilter={dinFilter}
            designationFilter={designationFilter}
            compensationSort={compensationSort}
            onNameFilterChange={value => setNameFilter(Array.isArray(value) ? value : value === null ? null : [value])}
            onDinFilterChange={value => setDinFilter(Array.isArray(value) ? value : value === null ? null : [value])}
            onDesignationFilterChange={value =>
              setDesignationFilter(Array.isArray(value) ? value : value === null ? null : [value])
            }
            onCompensationSortToggle={handleToggleCompensationSort}
            onDirectorClick={handleDirectorClick}
            FilterDropdown={FilterDropdown}
          />

          {selectedDirector && typeof selectedCompany === "string" && (
            <>
              <DirectorDetailsSection
                director={selectedDirector}
                companyName={selectedCompany}
                companyData={selectedCompanyData}
                directorDetailsRef={directorDetailsRef}
                onClose={() => setSelectedDirector(null)}
                toFY={toFY}
                otherCompanies={directorAllCompaniesData[selectedDirector.din]}
              />
            </>
          )}

          <VisualizationsSection toFY={toFY} />
        </div>
      )}
    </div>
  );
}
