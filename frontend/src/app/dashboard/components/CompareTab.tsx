"use client";

import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "@/components/forms";
import { EsopValueChart, PieChart } from "@/components/charts";
import { buildNiceTicks } from "@/utils/chart";
import { formatCurrencyAxisTick, formatCurrencyCompact, formatCurrencyRaw } from "@/utils/currency";
import { buildEsopValueSeries } from "@/utils/esop";
import { computeCfsnGrowth } from "@/utils/growth";
import { apiClient } from "@/lib/api";
import { DirectorInfo } from "../data";
import { useAllDirectorsDropdown, useDirectorHistory } from "@/hooks/useDataApi";
import type { DirectorHistory } from "@/utils/transformers";
import { yearToFyLabel } from "@/utils/transformers";

interface CompareTabProps {
  onLayoutModeChange?: (isWide: boolean) => void;
}

type DirectorIdentity = { id: number; name: string; din: string | null; directorCode: string };

type DirectorProfile = {
  identity: DirectorIdentity;
  history: DirectorHistory;
};

const parseCurrency = (value: string) => parseInt(value.replace(/[₹,]/g, ""), 10);

const flattenHistory = (history: DirectorHistory) => history.flatMap(entry => entry.data);

const formatAmountShort = (value: number) => formatCurrencyCompact(value);

const formatAxisTick = (value: number) => formatCurrencyAxisTick(value);

const formatAmountFull = (value: number) => formatCurrencyRaw(value);

const buildIndividualRemunerationBreakdown = (profile: DirectorProfile) => {
  const records = flattenHistory(profile.history);
  if (records.length === 0) {
    return null;
  }

  const latestRecord = [...records].sort((a, b) => b.year - a.year)[0];
  const totalCompensation = parseCurrency(latestRecord.compensation ?? "₹0");
  if (totalCompensation <= 0) {
    return null;
  }

  const salary = parseCurrency(latestRecord.salary ?? "₹0");
  const bonus = parseCurrency(latestRecord.bonus ?? "₹0");
  const perquisites = parseCurrency(latestRecord.perquisites ?? "₹0");
  const retirement = parseCurrency(latestRecord.retirementBenefits ?? "₹0");
  const esop = parseCurrency(latestRecord.esopMarketValue ?? "₹0");

  const slices = [
    { label: "Salary", value: salary, color: "#4F46E5" },
    { label: "Bonus", value: bonus, color: "#0EA5E9" },
    { label: "Perquisites", value: perquisites, color: "#F59E0B" },
    { label: "Retirement", value: retirement, color: "#10B981" },
    { label: "ESOP Value", value: esop, color: "#8B5CF6" },
  ];

  const accounted = slices.reduce((sum, slice) => sum + slice.value, 0);
  const otherTotal = Math.max(totalCompensation - accounted, 0);

  const filtered = slices.filter(slice => slice.value > 0);
  if (otherTotal > 0) {
    filtered.push({ label: "Other", value: otherTotal, color: "#6B7280" });
  }

  if (filtered.length === 0) {
    return null;
  }

  return {
    data: filtered.map(slice => ({
      label: slice.label,
      value: Number(((slice.value / totalCompensation) * 100).toFixed(1)),
      amount: formatAmountShort(slice.value),
      color: slice.color,
    })),
    totalAmount: formatAmountShort(totalCompensation),
    year: latestRecord.year,
  };
};



export default function CompareTab({ onLayoutModeChange }: CompareTabProps = {}) {
  const [compareSelectedDirector, setCompareSelectedDirector] = useState<DirectorIdentity | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonDirectors, setComparisonDirectors] = useState<(DirectorIdentity | null)[]>([null, null, null]);

  // Restore persisted state after mount to ensure UI updates
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isValidIdentity = (v: any): v is DirectorIdentity =>
        v && typeof v === "object" && typeof v.id === "number" && typeof v.directorCode === "string";
      const storedCompare = localStorage.getItem("dashboard_compareSelectedDirector");
      if (storedCompare) {
        try {
          const parsed = JSON.parse(storedCompare);
          if (isValidIdentity(parsed)) setCompareSelectedDirector(parsed);
          else localStorage.removeItem("dashboard_compareSelectedDirector");
        } catch { localStorage.removeItem("dashboard_compareSelectedDirector"); }
      }
      const storedComparison = localStorage.getItem("dashboard_comparisonDirectors");
      if (storedComparison) {
        try {
          const parsed = JSON.parse(storedComparison);
          if (Array.isArray(parsed) && parsed.every(v => v === null || isValidIdentity(v)))
            setComparisonDirectors(parsed);
          else localStorage.removeItem("dashboard_comparisonDirectors");
        } catch { localStorage.removeItem("dashboard_comparisonDirectors"); }
      }
    }
  }, []);
  useEffect(() => {
    if (compareSelectedDirector !== null && compareSelectedDirector !== undefined) {
      localStorage.setItem("dashboard_compareSelectedDirector", JSON.stringify(compareSelectedDirector));
    } else {
      localStorage.removeItem("dashboard_compareSelectedDirector");
    }
  }, [compareSelectedDirector]);

  useEffect(() => {
    if (comparisonDirectors && comparisonDirectors.some(d => d !== null && d !== undefined)) {
      localStorage.setItem("dashboard_comparisonDirectors", JSON.stringify(comparisonDirectors));
    } else {
      localStorage.removeItem("dashboard_comparisonDirectors");
    }
  }, [comparisonDirectors]);

  // Director data from API
  const { data: allDirectorsList } = useAllDirectorsDropdown();

  const directorRegistry = useMemo(() => {
    const registry = new Map<string, DirectorIdentity & { company: string }>();
    (allDirectorsList ?? []).forEach(dir => {
      registry.set(dir.director_code, {
        id: dir.id,
        name: dir.director_name,
        din: dir.din ?? null,
        directorCode: dir.director_code,
        company: dir.company__company_name,
      });
    });
    return registry;
  }, [allDirectorsList]);

  const directorOptions = useMemo(
    () =>
      Array.from(directorRegistry.values())
        .map(entry => ({
          id: entry.directorCode,
          label: `${entry.name}\nDIN: ${entry.din ?? 'N/A'}\n${entry.company}`,
          value: entry.directorCode,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [directorRegistry],
  );

  // History hooks for the 4 possible selected directors (hooks must be unconditional)
  const history0 = useDirectorHistory(compareSelectedDirector?.id ?? null);
  const history1 = useDirectorHistory(comparisonDirectors[0]?.id ?? null);
  const history2 = useDirectorHistory(comparisonDirectors[1]?.id ?? null);
  const history3 = useDirectorHistory(comparisonDirectors[2]?.id ?? null);

  useEffect(() => {
    if (!compareSelectedDirector) {
      setIsComparisonMode(false);
      setComparisonDirectors([null, null, null]);
    }
  }, [compareSelectedDirector]);

  useEffect(() => {
    onLayoutModeChange?.(isComparisonMode);
  }, [isComparisonMode, onLayoutModeChange]);

  const resolvedProfiles: (DirectorProfile | null)[] = useMemo(() => {
    const historyResults = [history0.data, history1.data, history2.data, history3.data];
    const identities = [compareSelectedDirector, ...comparisonDirectors];
    return identities.map((identity, i) => {
      if (!identity) return null;
      const historyData = historyResults[i];
      return {
        identity,
        history: historyData?.history ?? [],
      } satisfies DirectorProfile;
    });
  }, [history0.data, history1.data, history2.data, history3.data, compareSelectedDirector, comparisonDirectors]);

  const selectedProfile = resolvedProfiles[0];
  const hasComparisonData = resolvedProfiles.some(profile => profile !== null);

  const selectableOptionsForIndex = (slot: number) => {
    const usedCodes = new Set(
      [compareSelectedDirector, ...comparisonDirectors]
        .map(identity => identity?.directorCode)
        .filter((code): code is string => Boolean(code)),
    );

    const currentSelection = comparisonDirectors[slot]?.directorCode;
    if (currentSelection) {
      usedCodes.delete(currentSelection);
    }

    return directorOptions.filter(option => {
      const optionValue = String(option.value ?? option.id);
      return !usedCodes.has(optionValue);
    });
  };

  const handleAssignDirector = (slot: number, selected: string | number | (string | number)[] | null) => {
    setComparisonDirectors(prev => {
      const next = [...prev];
      if (typeof selected === "string" || typeof selected === "number") {
        const identity = directorRegistry.get(String(selected)) ?? null;
        next[slot] = identity ? { id: identity.id, name: identity.name, din: identity.din, directorCode: identity.directorCode } : null;
        
        // Track director selection
        if (identity) {
          apiClient.logSelectionActivity('directors', [identity.name]);
        }
      } else {
        next[slot] = null;
      }
      return next;
    });
  };

  return (
    <div className="mx-6 md:mx-12 lg:mx-16">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Executive Director Profile</h2>
        </div>
        <div>
          {compareSelectedDirector && !isComparisonMode && (
            <button
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              onClick={() => setIsComparisonMode(true)}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Compare Executive Directors
            </button>
          )}
          {isComparisonMode && (
            <button
              className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              onClick={() => {
                setIsComparisonMode(false);
                setComparisonDirectors([null, null, null]);
              }}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit Comparison
            </button>
          )}
        </div>
      </div>

      {isComparisonMode ? (
        <div className="mb-6 space-y-4 lg:grid lg:grid-cols-4 lg:gap-12 lg:space-y-0">
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-3">
              {selectedProfile ? (
                <>
                  <p className="text-sm font-semibold text-indigo-900">{selectedProfile.identity.name}</p>
                  <p className="text-xs text-indigo-700">DIN: {selectedProfile.identity.din ?? 'N/A'}</p>
                </>
              ) : (
                <p className="text-sm text-indigo-700">Select a base executive director first.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-3 lg:grid-cols-3">
            {[0, 1, 2].map(index => (
              <div key={`comparison-selector-${index}`} className="space-y-3">
                <Dropdown
                  options={selectableOptionsForIndex(index)}
                  placeholder={`Select executive director ${index + 2}...`}
                  isMultiSelect={false}
                  isSearchable
                  onSelectionChange={value => handleAssignDirector(index, value)}
                  value={comparisonDirectors[index]?.directorCode ?? null}
                  showSelectAll={false}
                  showReset={false}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Select Executive Director</label>
          <div className="max-w-md">
            <Dropdown
              options={directorOptions}
              placeholder="Select an executive director..."
              isMultiSelect={false}
              isSearchable
              onSelectionChange={selected => {
                if (selected && typeof selected === "string") {
                  const identity = directorRegistry.get(selected) ?? null;
                  setCompareSelectedDirector(identity ? { ...identity } : null);
                  // Track director selection
                  if (identity) {
                    apiClient.logSelectionActivity('directors', [identity.name]);
                  }
                } else if (selected && typeof selected === "number") {
                  const identity = directorRegistry.get(String(selected)) ?? null;
                  setCompareSelectedDirector(identity ? { ...identity } : null);
                  // Track director selection
                  if (identity) {
                    apiClient.logSelectionActivity('directors', [identity.name]);
                  }
                } else {
                  setCompareSelectedDirector(null);
                }
              }}
              value={compareSelectedDirector?.directorCode ?? null}
              showSelectAll={false}
              showReset={false}
            />
          </div>
        </div>
      )}

      {isComparisonMode ? (
        <ComparisonModeView profiles={resolvedProfiles} hasData={hasComparisonData} />
      ) : (
        <SingleDirectorView profile={selectedProfile} onClear={() => setCompareSelectedDirector(null)} />
      )}
    </div>
  );
}

interface ComparisonModeViewProps {
  profiles: (DirectorProfile | null)[];
  hasData: boolean;
}

function ComparisonModeView({ profiles, hasData }: ComparisonModeViewProps) {
  const [primaryProfile, ...secondaryProfiles] = profiles;
  const directors = profiles.filter((profile): profile is DirectorProfile => profile !== null);

  return (
    <div className="space-y-8">
      <div className="space-y-4 lg:grid lg:grid-cols-4 lg:gap-12 lg:space-y-0">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm lg:col-span-1">
          {primaryProfile ? (
            <ProfileSummary profile={primaryProfile} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select a base executive director first.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-3 lg:grid-cols-3">
          {secondaryProfiles.map((profile, index) => (
            <div
              key={`comparison-card-${index + 1}`}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm"
            >
              {profile ? (
                <ProfileSummary profile={profile} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Select executive director {index + 2}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <CompensationTrajectory directors={directors} />

      {directors.length > 1 && <ComparisonMetricsTable directors={directors} />}

      {!hasData && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          Add executive directors to view comparative insights.
        </div>
      )}
    </div>
  );
}

interface SingleDirectorViewProps {
  profile: DirectorProfile | null;
  onClear: () => void;
}

function SingleDirectorView({ profile, onClear }: SingleDirectorViewProps) {
  // Hooks must be unconditional — compute from optional profile
  const history = profile?.history ?? [];
  const flattened = flattenHistory(history);
  const esopSeries = useMemo(() => buildEsopValueSeries(flattenHistory(history)), [history]);

  if (!profile) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        Select an executive director to view their snapshot.
      </div>
    );
  }

  const totalYears = flattened.length;
  const compensations = flattened.map(record => parseCurrency(record.compensation));
  const averageComp = compensations.reduce((sum, value) => sum + value, 0) / (compensations.length || 1);
  const peakComp = Math.max(...compensations);
  const latestRecord = flattened.length > 0 ? [...flattened].sort((a, b) => b.year - a.year)[0] : null;
  const companyName = history[0]?.company ?? 'N/A';
  const designation = latestRecord?.designation ?? 'N/A';
  const sector = latestRecord?.sector ?? null;
  const latestFY = latestRecord ? yearToFyLabel(latestRecord.year) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{profile.identity.name}</h3>
            <p className="mt-0.5 text-sm font-semibold text-indigo-700">{designation} · {companyName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">DIN: {profile.identity.din ?? 'N/A'}</span>
              {sector && <span className="text-xs text-gray-400">· {sector}</span>}
              {latestFY && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Latest: {latestFY}</span>}
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-2xl font-bold leading-none text-gray-400 hover:text-gray-600"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Years of Data" value={totalYears.toString()} subtitle={`${history[0]?.data?.[history[0]?.data?.length - 1]?.year ?? '—'} – ${latestRecord?.year ?? '—'}`} />
          <StatCard label="Latest Pay" value={latestRecord ? formatCurrencyCompact(parseCurrency(latestRecord.compensation)) : '—'} subtitle={latestFY ?? 'N/A'} />
          <StatCard label="Average Pay" value={formatCurrencyCompact(averageComp)} subtitle="Per annum" />
          <StatCard label="Peak Pay" value={formatCurrencyCompact(peakComp)} subtitle="Highest year" />
        </div>
      </div>

      <EsopValueChart series={esopSeries} />

      <CompanyHistory history={history} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
}

function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4 text-sm shadow-sm">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

interface CompensationTrajectoryProps {
  directors: DirectorProfile[];
}

function CompensationTrajectory({ directors }: CompensationTrajectoryProps) {
  if (directors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Compensation Trajectory Over Time</h3>
        <p className="mt-2 text-sm text-gray-500">Add executive directors to view compensation trends.</p>
      </div>
    );
  }

  const colors = ["#4F46E5", "#0D9488", "#D97706", "#059669"];
  const years = new Set<number>();

  const series = directors.map((profile, index) => {
    const records = flattenHistory(profile.history)
      .map(record => ({ ...record, numericCompensation: parseCurrency(record.compensation ?? "₹0") }))
      .sort((a, b) => a.year - b.year);

    records.forEach(record => years.add(record.year));

    return {
      profile,
      color: colors[index % colors.length],
      records,
    };
  });

  const sortedYears = Array.from(years).sort((a, b) => a - b);

  const maxComp = series.reduce((max, entry) => {
    const localMax = entry.records.reduce((local, record) => Math.max(local, record.numericCompensation), 0);
    return Math.max(max, localMax);
  }, 0);

  const [hoveredPoint, setHoveredPoint] = useState<{
    xPercent: number;
    yPercent: number;
    year: number;
    value: number;
    director: string;
    color: string;
  } | null>(null);

  if (sortedYears.length === 0 || maxComp <= 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Compensation Trajectory Over Time</h3>
        <p className="mt-2 text-sm text-gray-500">Compensation trend data is unavailable for the selected directors.</p>
      </div>
    );
  }

  const svgWidth = 640;
  const svgHeight = 320;
  const chartPadding = {
    top: 24,
    right: 40,
    bottom: 52,
    left: 72,
  };

  const plotWidth = svgWidth - chartPadding.left - chartPadding.right;
  const plotHeight = svgHeight - chartPadding.top - chartPadding.bottom;
  const minYear = sortedYears[0];
  const yearRange = sortedYears[sortedYears.length - 1] - minYear || 1;

  const yTickValues = buildNiceTicks(maxComp, 5);
  const yScaleMax = yTickValues[yTickValues.length - 1] || maxComp || 1;

  const getXPosition = (year: number) =>
    chartPadding.left + ((year - minYear) / yearRange) * plotWidth;
  const getYPosition = (value: number) =>
    chartPadding.top + (1 - Math.min(value, yScaleMax) / yScaleMax) * plotHeight;

  const desiredXTicks = Math.min(sortedYears.length, 6);
  const tickInterval = Math.max(Math.ceil(sortedYears.length / desiredXTicks), 1);
  const xTickSet = new Set<number>();

  sortedYears.forEach((year, idx) => {
    if (idx === 0 || idx === sortedYears.length - 1 || idx % tickInterval === 0) {
      xTickSet.add(year);
    }
  });

  const xTickValues = Array.from(xTickSet).sort((a, b) => a - b);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Compensation Trajectory Over Time</h3>
      <div className="mt-6 space-y-6">
        <div className="relative w-full" style={{ aspectRatio: "3 / 1" }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="absolute inset-0 h-full w-full">
            <line
              x1={chartPadding.left}
              y1={chartPadding.top}
              x2={chartPadding.left}
              y2={svgHeight - chartPadding.bottom}
              stroke="#D1D5DB"
              strokeWidth={0.6}
            />
            <line
              x1={chartPadding.left}
              y1={svgHeight - chartPadding.bottom}
              x2={svgWidth - chartPadding.right}
              y2={svgHeight - chartPadding.bottom}
              stroke="#D1D5DB"
              strokeWidth={0.6}
            />

            {yTickValues.map((tickValue, idx) => {
              const y = getYPosition(tickValue);
              return (
                <g key={`h-grid-${idx}`}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={svgWidth - chartPadding.right}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth={0.6}
                  />
                  <text
                    x={chartPadding.left - 12}
                    y={y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fontSize={12}
                    fill="#6B7280"
                  >
                    {formatAxisTick(tickValue)}
                  </text>
                </g>
              );
            })}

            {xTickValues.map((year, idx) => {
              const x = getXPosition(year);
              return (
                <g key={`v-grid-${idx}`}>
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
                    y={svgHeight - chartPadding.bottom + 24}
                    textAnchor="middle"
                    alignmentBaseline="hanging"
                    fontSize={12}
                    fill="#6B7280"
                  >
                    {`FY${year.toString().slice(-2)}`}
                  </text>
                </g>
              );
            })}

            {series.map(entry => {
              const { profile, color, records } = entry;

              if (records.length === 0) {
                return null;
              }

              const points = records
                .map(record => `${getXPosition(record.year)},${getYPosition(record.numericCompensation)}`)
                .join(" ");

              return (
                <g key={profile.identity.directorCode}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {records.map(record => (
                    <circle
                      key={`${profile.identity.directorCode}-${record.year}`}
                      cx={getXPosition(record.year)}
                      cy={getYPosition(record.numericCompensation)}
                      r={4}
                      fill={color}
                      stroke="#F9FAFB"
                      strokeWidth={1.2}
                      tabIndex={0}
                      onMouseEnter={() => {
                        const x = getXPosition(record.year);
                        const y = getYPosition(record.numericCompensation);
                        setHoveredPoint({
                          xPercent: (x / svgWidth) * 100,
                          yPercent: (y / svgHeight) * 100,
                          year: record.year,
                          value: record.numericCompensation,
                          director: profile.identity.name,
                          color,
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() => {
                        const x = getXPosition(record.year);
                        const y = getYPosition(record.numericCompensation);
                        setHoveredPoint({
                          xPercent: (x / svgWidth) * 100,
                          yPercent: (y / svgHeight) * 100,
                          year: record.year,
                          value: record.numericCompensation,
                          director: profile.identity.name,
                          color,
                        });
                      }}
                      onBlur={() => setHoveredPoint(null)}
                      aria-label={`${profile.identity.name} earned ${formatAmountFull(record.numericCompensation)} in FY ${record.year}`}
                    />
                  ))}
                </g>
              );
            })}
          </svg>
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
              style={{
                left: `${Math.min(Math.max(hoveredPoint.xPercent, 8), 92)}%`,
                top: `${Math.min(Math.max(hoveredPoint.yPercent, 12), 88)}%`,
                transform: "translate(-50%, -110%)",
              }}
            >
              <div className="text-[10px] uppercase text-gray-300">{hoveredPoint.director}</div>
              <div className="mt-0.5 font-semibold">{formatAmountFull(hoveredPoint.value)}</div>
              <div className="text-[10px] text-gray-300">FY {hoveredPoint.year}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-700">
          {series.map(entry => (
            <div key={entry.profile.identity.directorCode} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.profile.identity.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonMetricsTable({ directors }: { directors: DirectorProfile[] }) {
  const colors = ["#4F46E5", "#0D9488", "#D97706", "#059669"];

  const rows: { label: string; getValue: (p: DirectorProfile) => string; className?: string }[] = [
    {
      label: "Company",
      getValue: p => p.history[0]?.company ?? "N/A",
    },
    {
      label: "Designation",
      getValue: p => {
        const records = flattenHistory(p.history);
        const latest = records.sort((a, b) => b.year - a.year)[0];
        return latest?.designation ?? "N/A";
      },
    },
    {
      label: "Sector",
      getValue: p => {
        const records = flattenHistory(p.history);
        return records[0]?.sector ?? "N/A";
      },
    },
    {
      label: `Latest Pay (${yearToFyLabel(flattenHistory(directors[0].history).sort((a, b) => b.year - a.year)[0]?.year ?? 2016)})`,
      getValue: p => {
        const records = flattenHistory(p.history).sort((a, b) => b.year - a.year);
        return records[0] ? formatCurrencyCompact(parseCurrency(records[0].compensation)) : "N/A";
      },
      className: "font-semibold text-indigo-700",
    },
    {
      label: "Average Pay",
      getValue: p => {
        const vals = flattenHistory(p.history).map(r => parseCurrency(r.compensation));
        return vals.length > 0 ? formatCurrencyCompact(vals.reduce((s, v) => s + v, 0) / vals.length) : "N/A";
      },
    },
    {
      label: "Peak Pay",
      getValue: p => {
        const vals = flattenHistory(p.history).map(r => parseCurrency(r.compensation));
        return vals.length > 0 ? formatCurrencyCompact(Math.max(...vals)) : "N/A";
      },
    },
    {
      label: "Avg Basic Salary",
      getValue: p => {
        const vals = flattenHistory(p.history).map(r => parseCurrency(r.salary ?? "₹0")).filter(v => v > 0);
        return vals.length > 0 ? formatCurrencyCompact(vals.reduce((s, v) => s + v, 0) / vals.length) : "N/A";
      },
    },
    {
      label: "Avg Bonus",
      getValue: p => {
        const vals = flattenHistory(p.history).map(r => parseCurrency(r.bonus ?? "₹0")).filter(v => v > 0);
        return vals.length > 0 ? formatCurrencyCompact(vals.reduce((s, v) => s + v, 0) / vals.length) : "N/A";
      },
    },
    {
      label: "Variable Ratio",
      getValue: p => {
        const records = flattenHistory(p.history);
        const avgComp = records.map(r => parseCurrency(r.compensation));
        const avgBonus = records.map(r => parseCurrency(r.bonus ?? "₹0"));
        const totalComp = avgComp.reduce((s, v) => s + v, 0);
        const totalBonus = avgBonus.reduce((s, v) => s + v, 0);
        return totalComp > 0 ? `${((totalBonus / totalComp) * 100).toFixed(1)}%` : "N/A";
      },
    },
    {
      label: "Career Growth",
      getValue: p => {
        const records = flattenHistory(p.history).sort((a, b) => a.year - b.year);
        if (records.length < 2) return "N/A";
        const first = parseCurrency(records[0].compensation);
        const last = parseCurrency(records[records.length - 1].compensation);
        if (first <= 0) return "N/A";
        const pct = ((last - first) / first) * 100;
        return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
      },
    },
    {
      label: "Options Granted",
      getValue: p => {
        const total = flattenHistory(p.history).reduce((s, r) => s + (r.optionsGranted ?? 0), 0);
        return total > 0 ? total.toLocaleString() : "\u2014";
      },
    },
    {
      label: "ESOP Value",
      getValue: p => {
        const total = flattenHistory(p.history).reduce((s, r) => s + (r.esopsExercised ?? 0), 0);
        return total > 0 ? formatAmountShort(total) : "\u2014";
      },
    },
    {
      label: "Gender",
      getValue: p => flattenHistory(p.history).sort((a, b) => b.year - a.year)[0]?.gender ?? "N/A",
    },
    {
      label: "Pay vs Median Employee",
      getValue: p => {
        const ratios = flattenHistory(p.history)
          .filter(r => r.salaryToMedianEmployeeRatio)
          .map(r => parseFloat(r.salaryToMedianEmployeeRatio!));
        return ratios.length > 0 ? `${(ratios.reduce((s, v) => s + v, 0) / ratios.length).toFixed(1)}x` : "N/A";
      },
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Side-by-Side Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Metric</th>
              {directors.map((p, i) => (
                <th key={p.identity.directorCode} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors[i % colors.length] }}>
                  {p.identity.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => (
              <tr key={row.label} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-6 py-3 text-xs font-medium text-gray-500">{row.label}</td>
                {directors.map((p, i) => (
                  <td key={p.identity.directorCode} className={`px-4 py-3 text-sm ${row.className ?? "text-gray-900"}`}>
                    {row.getValue(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: DirectorProfile }) {
  const history = profile.history;
  const allRecords = flattenHistory(history);

  if (history.length === 0 || allRecords.length === 0) {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  const sortedRecords = [...allRecords].sort((a, b) => b.year - a.year);
  const latestRecord = sortedRecords[0];
  const allCompensations = allRecords.map(record => parseCurrency(record.compensation));
  const totalCompanies = history.length;
  const totalYears = allRecords.length;
  const avgCompensation = allCompensations.reduce((sum, value) => sum + value, 0) / allCompensations.length;
  const peakCompensation = Math.max(...allCompensations);
  const totalEarnings = allCompensations.reduce((sum, value) => sum + value, 0);
  const compensationGrowthRate = computeCfsnGrowth(
    allRecords.map(record => ({ year: record.year, value: parseCurrency(record.compensation) })),
  );
  const compensationGrowthPercent = compensationGrowthRate === null ? null : compensationGrowthRate * 100;
  const compensationGrowthDisplay = compensationGrowthPercent === null
    ? "N/A"
    : `${compensationGrowthPercent >= 0 ? "+" : ""}${compensationGrowthPercent.toFixed(1)}%`;
  const compensationGrowthClass = compensationGrowthPercent === null
    ? "text-gray-500"
    : compensationGrowthPercent >= 0
      ? "text-emerald-600"
      : "text-red-600";

  const totalESOPs = allRecords.reduce((sum, record) => sum + (record.esopsExercised || 0), 0);
  const totalOptionsGranted = allRecords.reduce((sum, record) => sum + (record.optionsGranted || 0), 0);

  const directorCategory = latestRecord.directorCategory || "N/A";
  const promoterStatus = latestRecord.promoterStatus || "N/A";
  const gender = latestRecord.gender || "N/A";
  const age = latestRecord.dateOfBirth
    ? Math.floor((Date.now() - new Date(latestRecord.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  const appointmentDate = latestRecord.appointmentDate || "N/A";
  const sector = latestRecord.sector || "N/A";
  const industry = latestRecord.industry || "N/A";

  const salaryRatios = allRecords.filter(record => record.salaryToMedianEmployeeRatio).map(record => parseFloat(record.salaryToMedianEmployeeRatio!));
  const avgSalaryRatio = salaryRatios.length > 0
    ? (salaryRatios.reduce((sum, value) => sum + value, 0) / salaryRatios.length).toFixed(1)
    : null;

  const avgSalary = allRecords.reduce((sum, record) => sum + parseCurrency(record.salary ?? "₹0"), 0) / totalYears;
  const avgBonus = allRecords.reduce((sum, record) => sum + parseCurrency(record.bonus ?? "₹0"), 0) / totalYears;
  const variableRatio = avgCompensation > 0 ? ((avgBonus / avgCompensation) * 100).toFixed(0) : "0";
  const latestBreakdown = buildIndividualRemunerationBreakdown(profile);
  const latestBreakdownLabel = latestBreakdown ? `FY${latestBreakdown.year.toString().slice(-2)}` : null;

  return (
    <div className="space-y-2">
      <div className="bg-indigo-50 border border-indigo-100 rounded p-2">
        <div className="text-xs text-gray-600 mb-1">Current Role</div>
        <div className="text-xs font-semibold text-gray-900">{latestRecord.designation}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-600">Companies</div>
          <div className="text-lg font-bold text-indigo-600">{totalCompanies}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Total Years</div>
          <div className="text-lg font-bold text-indigo-600">{totalYears}</div>
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Compensation</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Latest ({yearToFyLabel(latestRecord.year)})</span>
            <span className="text-xs font-semibold text-gray-900">{formatCurrencyCompact(parseCurrency(latestRecord.compensation))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Average</span>
            <span className="text-xs font-semibold text-gray-900">{formatCurrencyCompact(avgCompensation)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Peak</span>
            <span className="text-xs font-semibold text-indigo-600">{formatCurrencyCompact(peakCompensation)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Total Remuneration</span>
            <span className="text-xs font-semibold text-teal-600">{formatCurrencyCompact(totalEarnings)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Career Growth</span>
            <span className={`text-xs font-semibold ${compensationGrowthClass}`}>
              {compensationGrowthDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Variable Ratio</span>
            <span className="text-xs font-semibold text-amber-600">{variableRatio}%</span>
          </div>
        </div>
      </div>



      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-700">Remuneration Mix</div>
          {latestBreakdownLabel && <span className="text-[10px] uppercase text-gray-500">{latestBreakdownLabel}</span>}
        </div>
        {latestBreakdown ? (
          <div className="mt-2 rounded-md bg-white/60 p-3 flex flex-col gap-3">
            <PieChart
              data={latestBreakdown.data}
              totalAmount={latestBreakdown.totalAmount}
              size="sm"
              showLegend={false}
            />
            <div className="text-[11px] text-gray-600 flex-1">
              <div className="grid gap-1.5" style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}>
                {latestBreakdown.data.map(slice => (
                  <div
                    key={`${profile.identity.directorCode}-${slice.label}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span>{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{slice.value.toFixed(1)}%</span>
                      <span className="font-semibold text-gray-900">{slice.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded border border-dashed border-gray-300 p-3 text-xs text-gray-500 flex items-center justify-center text-center" style={{ minHeight: "220px" }}>
            Remuneration breakdown unavailable.
          </div>
        )}
      </div>

      <div className="border-t pt-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Profile</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Category</span>
            <span className="text-xs font-semibold text-gray-900">{directorCategory}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Status</span>
            <span className={`text-xs font-semibold ${promoterStatus === "Promoter" ? "text-indigo-600" : "text-gray-600"}`}>
              {promoterStatus}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Gender</span>
            <span className="text-xs font-semibold text-gray-900">{gender}</span>
          </div>
          {age && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Age</span>
              <span className="text-xs font-semibold text-gray-900">{age} years</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Appointed</span>
            <span className="text-xs font-semibold text-gray-900">{appointmentDate}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-gray-700">Equity</div>
          <div className="text-[10px] text-gray-400">~5% of directors</div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Total ESOP Value</span>
            <span className="text-xs font-semibold text-indigo-600">
              {totalESOPs > 0 ? formatCurrencyCompact(totalESOPs) : <span className="text-gray-400 font-normal">&mdash;</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Options Granted</span>
            <span className="text-xs font-semibold text-gray-900">
              {totalOptionsGranted > 0 ? totalOptionsGranted.toLocaleString() : <span className="text-gray-400 font-normal">&mdash;</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Industry</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Sector</span>
            <span className="ml-2 truncate text-xs font-semibold text-gray-900" title={sector}>
              {sector}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Industry</span>
            <span className="ml-2 truncate text-xs font-semibold text-gray-900" title={industry}>
              {industry}
            </span>
          </div>
          {avgSalaryRatio && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Pay vs Median</span>
              <span className="text-xs font-semibold text-teal-600">{avgSalaryRatio}x</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Companies</div>
        <div className="space-y-1">
          {history.map(entry => {
            const years = entry.data.length;
            return (
              <div key={entry.company} className="bg-gray-50 rounded px-2 py-1">
                <div className="truncate text-xs font-medium text-gray-900" title={entry.company}>
                  {entry.company}
                </div>
                <div className="text-xs text-gray-500">{years} {years === 1 ? "year" : "years"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompanyHistory({ history }: { history: DirectorHistory }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        Select an executive director to see their company history.
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Career Timeline by Company</h4>
      <div className="space-y-6">
        {history.map(entry => {
          const records = [...entry.data].sort((a, b) => b.year - a.year);
          const compensationValues = records.map(record => parseCurrency(record.compensation));
          const averageComp = compensationValues.length > 0
            ? compensationValues.reduce((sum, value) => sum + value, 0) / compensationValues.length
            : 0;
          const latestComp = compensationValues[0] ?? 0;

          const companyGrowthRate = computeCfsnGrowth(
            records.map(record => ({ year: record.year, value: parseCurrency(record.compensation) })),
          );
          const companyGrowthPercent = companyGrowthRate === null ? null : companyGrowthRate * 100;
          const companyGrowthDisplay = companyGrowthPercent === null
            ? "N/A"
            : `${companyGrowthPercent >= 0 ? "+" : ""}${companyGrowthPercent.toFixed(1)}%`;
          const companyGrowthClass = companyGrowthPercent === null
            ? "text-gray-500"
            : companyGrowthPercent >= 0
              ? "text-green-600"
              : "text-red-600";

          return (
            <div key={entry.company} className="bg-white border-l-4 border-indigo-500 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-lg font-bold text-gray-900">{entry.company}</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {records[records.length - 1].year} - {records[0].year}
                      <span className="mx-2">•</span>
                      {records.length} {records.length === 1 ? "year" : "years"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Latest Position ({yearToFyLabel(records[0].year)})</div>
                    <div className="text-sm font-semibold text-gray-900">{records[0].designation}</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Latest Compensation ({yearToFyLabel(records[0].year)})</div>
                    <div className="text-lg font-bold text-indigo-600">{formatCurrencyCompact(latestComp)}</div>
                    <div className="text-xs text-gray-500">{records[0].year}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Average</div>
                    <div className="text-lg font-bold text-gray-700">{formatCurrencyCompact(averageComp)}</div>
                    <div className="text-xs text-gray-500">{records.length} years</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Growth</div>
                    <div className={`text-lg font-bold ${companyGrowthClass}`}>
                      {companyGrowthDisplay}
                    </div>
                    <div className="text-xs text-gray-500">Overall</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Year</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Comp</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Basic Salary</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Bonus</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Perquisites</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">ESOPs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {records.map(record => (
                      <tr key={`${entry.company}-${record.year}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{yearToFyLabel(record.year)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-indigo-600 text-right">{record.compensation}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{record.salary ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{record.bonus ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{record.perquisites ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{record.esopsExercised ? formatAmountShort(record.esopsExercised) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
