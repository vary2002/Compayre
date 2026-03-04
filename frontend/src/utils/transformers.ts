/**
 * Data transformers: convert API response objects → DirectorInfo / CompanyInfo
 * shapes used by the dashboard components.
 */

import type { DirectorRemuneration, CompanyFinancials, Company } from '@/lib/api';
import type { DirectorInfo, CompanyInfo } from '@/app/dashboard/data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert "FY12" → 2012, "FY16" → 2016, etc. */
export function fyLabelToYear(fy: string): number {
  const nn = parseInt(fy.replace(/^FY/i, ''), 10);
  return isNaN(nn) ? 0 : 2000 + nn;
}

/** Convert year back to FY label: 2012 → "FY12" */
export function yearToFyLabel(year: number): string {
  return `FY${year.toString().slice(-2)}`;
}

/** Indian number format with ₹ prefix, e.g. 3800000 → "₹38,00,000" */
export function formatINR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '₹0';
  const rounded = Math.round(num);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';

  const str = abs.toString();
  if (str.length <= 3) return `${sign}₹${str}`;

  // First group of 3 from the right, then groups of 2
  let result = str.slice(-3);
  let remaining = str.slice(0, -3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) result = remaining + ',' + result;

  return `${sign}₹${result}`;
}

/** Convert a Decimal string to a number, return null if blank/invalid */
function toNum(val: string | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** Format ROA/percentage: "7.50000" → "7.5%" */
function formatPct(val: string | null | undefined): string | undefined {
  const n = toNum(val);
  if (n === null) return undefined;
  return `${parseFloat(n.toFixed(2))}%`;
}

/**
 * Format a value stored in crores as a "X Cr" string, e.g.:
 *   21201.948 → "₹21,202 Cr"
 * This allows parseCrToRupees() in VisualizationsSection to correctly
 * convert back to raw rupees (×1,00,00,000) for chart calculations.
 */
export function formatCrore(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0 Cr';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '₹0 Cr';
  const rounded = Math.round(num * 100) / 100; // 2 dp
  // Re-use Indian comma formatting on the integer part
  const intPart = Math.round(rounded);
  const str = Math.abs(intPart).toString();
  let result = str.slice(-3);
  let remaining = str.slice(0, -3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) result = remaining + ',' + result;
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₹${result} Cr`;
}

// ---------------------------------------------------------------------------
// Primary transformer: one DirectorRemuneration record → one DirectorInfo row
// ---------------------------------------------------------------------------

/**
 * Build a flat DirectorInfo[] from:
 *   - remuneration records (one per director per year, with director fields embedded)
 *   - financials keyed by financial_year
 *   - the Company record (for peer comps, salary-to-median, etc.)
 */
export function buildDirectorInfoArray(
  remunerationRecords: DirectorRemuneration[],
  financialsByYear: Record<string, CompanyFinancials>,
  company: Company | null,
): DirectorInfo[] {
  return remunerationRecords.map((rem): DirectorInfo => {
    const year = fyLabelToYear(rem.financial_year);
    const fin = financialsByYear[rem.financial_year] ?? null;

    const peerCompensations: string[] = company
      ? [
          company.peer_1_comp,
          company.peer_2_comp,
          company.peer_3_comp,
          company.peer_4_comp,
          company.peer_5_comp,
        ].filter((v): v is string => v !== null && v !== '')
      : [];

    return {
      // Identity
      name: rem.director_name,
      din: rem.din ?? rem.director_code,
      designation: rem.designation ?? '',
      directorCategory: rem.director_category ?? undefined,
      qualification: rem.qualification ?? undefined,
      dateOfBirth: rem.dob ?? undefined,
      promoterStatus: rem.promoter_status ?? undefined,
      gender: rem.gender ?? undefined,
      appointmentDate: rem.appointment_date ?? undefined,
      role: rem.director_role ?? undefined,

      // Per-year remuneration
      year,
      compensation: formatINR(rem.total_remuneration),
      salary: formatINR(rem.basic_salary),
      bonus: formatINR(rem.bonus_commission),
      perquisites: formatINR(rem.perquisites_allowances),
      retirementBenefits: formatINR(rem.pf_retirement),
      payExcludingEsops: formatINR(rem.pay_excl_esops),
      esopsExercised: toNum(rem.esops) ?? undefined,

      // ESOP options
      optionsGranted: toNum(rem.options_granted) ?? undefined,
      optionDiscount: rem.discount ? formatINR(rem.discount) : undefined,
      esopFairValue: rem.fair_value ? formatINR(rem.fair_value) : undefined,
      optionsAggregateValue: rem.aggregate_value ? formatINR(rem.aggregate_value) : undefined,
      esopMarketValue: rem.esops ? formatINR(rem.esops) : undefined,

      // Metadata
      comments: rem.comments ?? undefined,
      remunerationStatus: rem.remuneration_status ?? undefined,

      // Company financials for that year (same value for all directors)
      sector: company?.sector ?? (rem.sector || undefined),
      industry: company?.industry ?? (rem.industry || undefined),
      totalIncome: fin?.total_income ? formatCrore(fin.total_income) : undefined,
      profitAfterTax: fin?.pat ? formatCrore(fin.pat) : undefined,
      returnOnAssets: fin?.roa ? formatPct(fin.roa) : undefined,
      employeeCost: fin?.employee_cost ? formatCrore(fin.employee_cost) : undefined,
      companyMarketCap: fin?.mcap ? formatCrore(fin.mcap) : undefined,

      // Governance
      salaryToMedianEmployeeRatio: company?.salary_to_median_employee_pay
        ? String(parseFloat(company.salary_to_median_employee_pay))
        : undefined,
      peerCompensations: peerCompensations.length > 0 ? peerCompensations : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Company transformer
// ---------------------------------------------------------------------------

export function buildCompanyInfo(
  company: Company,
  latestFinancials: CompanyFinancials | null,
): CompanyInfo {
  return {
    name: company.company_name,
    bse: company.bse_scrip_code ?? '',
    sector: company.sector ?? '',
    marketCap: latestFinancials?.mcap ? formatCrore(latestFinancials.mcap) : '',
    stockIndex: company.index_name ?? undefined,
    numberOfEmployees: company.no_of_employees != null
      ? company.no_of_employees.toLocaleString('en-IN')
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Director history transformer (for CompareTab)
// ---------------------------------------------------------------------------

export type DirectorHistory = { company: string; data: DirectorInfo[] }[];

/**
 * Convert an array of remuneration records (for one director, possibly across
 * multiple years) into a DirectorHistory, given the company name.
 */
export function buildDirectorHistory(
  remunerationRecords: DirectorRemuneration[],
  companyName: string,
  financialsByYear: Record<string, CompanyFinancials> = {},
  company: Company | null = null,
): DirectorHistory {
  if (remunerationRecords.length === 0) return [];

  const directorInfos = buildDirectorInfoArray(remunerationRecords, financialsByYear, company);
  directorInfos.sort((a, b) => b.year - a.year);

  return [{ company: companyName, data: directorInfos }];
}
