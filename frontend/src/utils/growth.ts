export interface YearValueEntry {
  year: number;
  value: number;
}

const MAX_YEARS_DEFAULT = 5;

const sanitizeEntries = (entries: YearValueEntry[]) => {
  const yearMap = new Map<number, number>();

  entries.forEach(entry => {
    if (!entry || !Number.isFinite(entry.year) || !Number.isFinite(entry.value)) {
      return;
    }

    if (entry.value <= 0) {
      return;
    }

    const current = yearMap.get(entry.year) ?? 0;
    yearMap.set(entry.year, current + entry.value);
  });

  return Array.from(yearMap.entries())
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
};

export const computeCfsnGrowth = (entries: YearValueEntry[], maxYears = MAX_YEARS_DEFAULT): number | null => {
  const normalized = sanitizeEntries(entries);
  if (normalized.length < 2) {
    return null;
  }

  const usable = normalized.slice(-Math.max(maxYears, 2));
  if (usable.length < 2) {
    return null;
  }

  const first = usable[0];
  const last = usable[usable.length - 1];

  if (first.value <= 0 || last.value <= 0) {
    return null;
  }

  const spanYears = Math.max(last.year - first.year, usable.length - 1);
  if (spanYears <= 0) {
    return null;
  }

  const ratio = last.value / first.value;
  if (ratio <= 0) {
    return null;
  }

  const growth = Math.pow(ratio, 1 / spanYears) - 1;
  if (!Number.isFinite(growth)) {
    return null;
  }

  return growth;
};

export const formatGrowthPercentage = (growth: number | null, fractionDigits = 1): string | null => {
  if (growth === null || !Number.isFinite(growth)) {
    return null;
  }

  const percentage = growth * 100;
  if (!Number.isFinite(percentage)) {
    return null;
  }

  return `${percentage >= 0 ? "" : "-"}${Math.abs(percentage).toFixed(fractionDigits)}%`;
};

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * CAGR = (Ending Value / Beginning Value)^(1/Number of Years) - 1
 */
export const computeCAGR = (entries: YearValueEntry[]): number | null => {
  return computeCfsnGrowth(entries);
};

