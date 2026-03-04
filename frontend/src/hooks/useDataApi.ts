import { useState, useEffect } from 'react';
import { dataApi, CompanyDropdown, DirectorDropdown, DirectorRemuneration, CompanyFinancials, Company, PeerCompensationBar } from '@/lib/api';
import {
  buildDirectorInfoArray,
  buildCompanyInfo,
  buildDirectorHistory,
  type DirectorHistory,
} from '@/utils/transformers';
import type { DirectorInfo, CompanyInfo } from '@/app/dashboard/data';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Company dropdown
// ---------------------------------------------------------------------------

/**
 * All companies as a lightweight dropdown list (id, company_code, company_name).
 */
export function useCompaniesDropdown() {
  const [state, setState] = useState<UseFetchState<CompanyDropdown[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dataApi.getCompanyDropdown();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, []);

  return state;
}

// ---------------------------------------------------------------------------
// Directors dropdown
// ---------------------------------------------------------------------------

/**
 * All directors as a dropdown list (id, director_code, director_name, din, company__company_name).
 * Used by CompareTab to populate the executive director search.
 */
export function useAllDirectorsDropdown() {
  const [state, setState] = useState<UseFetchState<DirectorDropdown[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dataApi.getDirectorDropdown();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, []);

  return state;
}

/**
 * Directors dropdown optionally filtered by company. Used for company-scoped selects.
 */
export function useDirectorsDropdown(companyId?: number | string) {
  const [state, setState] = useState<UseFetchState<DirectorDropdown[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dataApi.getDirectorDropdown(companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyId]);

  return state;
}

// ---------------------------------------------------------------------------
// Company dashboard data (LookupTab primary hook)
// ---------------------------------------------------------------------------

interface CompanyDashboardData {
  directorInfos: DirectorInfo[];
  companyInfo: CompanyInfo | null;
  companyRecord: Company | null;
  peerBars: PeerCompensationBar[];
  peerFinancialYear: string;
}

/**
 * Loads all data needed for the LookupTab when a company is selected.
 * Fetches remuneration records (with embedded director fields) and financials
 * for the given company_code, then transforms into DirectorInfo[] + CompanyInfo.
 */
export function useCompanyDashboardData(companyCode?: string | null) {
  const [state, setState] = useState<UseFetchState<CompanyDashboardData>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!companyCode) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));

    const fetchData = async () => {
      try {
        const [remunerationResponse, financialsResponse, peerResponse] = await Promise.all([
          dataApi.getCompanyRemunerationData(companyCode),
          dataApi.getCompanyFinancialData(companyCode),
          dataApi.getPeerCompensation(companyCode).catch(() => ({ financial_year: '', bars: [] as PeerCompensationBar[] })),
        ]);

        if (cancelled) return;

        const remuneration: DirectorRemuneration[] = remunerationResponse.remuneration_data ?? [];
        const financials: CompanyFinancials[] = financialsResponse.financial_data ?? [];

        // Build financials lookup by year
        const financialsByYear: Record<string, CompanyFinancials> = {};
        for (const fin of financials) {
          financialsByYear[fin.financial_year] = fin;
        }

        // Fetch full company record for peer comps, salary-to-median, etc.
        let companyRecord: Company | null = null;
        try {
          const companyId = remunerationResponse.company?.id;
          if (companyId) {
            companyRecord = await dataApi.getCompanyDetails(companyId);
          }
        } catch {
          // Non-critical — peer comps and salary-to-median will be absent
        }

        if (cancelled) return;

        const directorInfos = buildDirectorInfoArray(remuneration, financialsByYear, companyRecord);

        const sortedYears = Object.keys(financialsByYear).sort().reverse();
        const latestFin = sortedYears.length > 0 ? financialsByYear[sortedYears[0]] : null;
        const companyInfo = companyRecord ? buildCompanyInfo(companyRecord, latestFin) : null;

        setState({ data: { directorInfos, companyInfo, companyRecord, peerBars: peerResponse.bars, peerFinancialYear: peerResponse.financial_year }, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error as Error });
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [companyCode]);

  return state;
}

// ---------------------------------------------------------------------------
// Director remuneration history (CompareTab hook)
// ---------------------------------------------------------------------------

interface DirectorHistoryData {
  history: DirectorHistory;
  directorId: number;
}

/**
 * Fetches the full remuneration history for one director (by their DB id).
 * Returns DirectorHistory = [{company, data: DirectorInfo[]}]
 */
export function useDirectorHistory(directorId?: number | null) {
  const [state, setState] = useState<UseFetchState<DirectorHistoryData>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!directorId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));

    const fetchData = async () => {
      try {
        const response = await dataApi.getDirectorRemunerationTimeSeries(directorId);
        if (cancelled) return;

        const remuneration: DirectorRemuneration[] = response.remuneration_data ?? [];
        const companyName = remuneration[0]?.company_name ?? '';
        const history = buildDirectorHistory(remuneration, companyName);

        setState({ data: { history, directorId }, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error as Error });
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [directorId]);

  return state;
}

// ---------------------------------------------------------------------------
// Existing utility hooks
// ---------------------------------------------------------------------------

export function useSectors() {
  const [state, setState] = useState<UseFetchState<string[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { sectors } = await dataApi.getSectors();
        setState({ data: sectors, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, []);

  return state;
}

export function useIndustries() {
  const [state, setState] = useState<UseFetchState<string[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { industries } = await dataApi.getIndustries();
        setState({ data: industries, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, []);

  return state;
}

export function useDirectorRemunerationTimeSeries(directorId?: number | string, companyId?: string) {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!directorId,
    error: null,
  });

  useEffect(() => {
    if (!directorId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.getDirectorRemunerationTimeSeries(directorId, companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [directorId, companyId]);

  return state;
}

export function useCompanyFinancialData(companyCode?: string) {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!companyCode,
    error: null,
  });

  useEffect(() => {
    if (!companyCode) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.getCompanyFinancialData(companyCode);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyCode]);

  return state;
}

export function useCompanyRemunerationData(companyCode?: string) {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!companyCode,
    error: null,
  });

  useEffect(() => {
    if (!companyCode) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.getCompanyRemunerationData(companyCode);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyCode]);

  return state;
}

export function useCompaniesFinancialComparison(companyIds?: (string | number)[], metric: string = 'total_income') {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!companyIds && companyIds.length > 0,
    error: null,
  });

  useEffect(() => {
    if (!companyIds || companyIds.length === 0) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.compareCompaniesFinancial(companyIds, metric);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyIds, metric]);

  return state;
}

export function useCompanyDetails(companyId?: string | number) {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!companyId,
    error: null,
  });

  useEffect(() => {
    if (!companyId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.getCompanyDetails(companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyId]);

  return state;
}

export function useDirectorDetails(directorId?: string | number) {
  const [state, setState] = useState<UseFetchState<any>>({
    data: null,
    loading: !!directorId,
    error: null,
  });

  useEffect(() => {
    if (!directorId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchData = async () => {
      try {
        const data = await dataApi.getDirectorDetails(directorId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [directorId]);

  return state;
}
