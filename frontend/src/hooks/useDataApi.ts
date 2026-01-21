import { useState, useEffect, useCallback } from 'react';
import { dataApi } from '@/lib/api';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch companies dropdown data
 */
export function useCompaniesDropdown() {
  const [state, setState] = useState<UseFetchState<any[]>>({
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

/**
 * Hook to fetch directors dropdown data (optionally filtered by company)
 */
export function useDirectorsDropdown(companyId?: string) {
  const [state, setState] = useState<UseFetchState<any[]>>({
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

/**
 * Hook to fetch sectors for filtering
 */
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

/**
 * Hook to fetch industries for filtering
 */
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

/**
 * Hook to fetch director remuneration time series data for charting
 */
export function useDirectorRemunerationTimeSeries(directorId?: string, companyId?: string) {
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

/**
 * Hook to fetch company financial data for charting
 */
export function useCompanyFinancialData(companyId?: string) {
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
        const data = await dataApi.getCompanyFinancialData(companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyId]);

  return state;
}

/**
 * Hook to fetch company remuneration data (all directors in company)
 */
export function useCompanyRemunerationData(companyId?: string) {
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
        const data = await dataApi.getCompanyRemunerationData(companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyId]);

  return state;
}

/**
 * Hook to fetch peer comparisons for a company
 */
export function useCompanyPeerComparisons(companyId?: string) {
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
        const data = await dataApi.getCompanyPeerComparisons(companyId);
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [companyId]);

  return state;
}

/**
 * Hook to compare financial metrics across multiple companies
 */
export function useCompaniesFinancialComparison(companyIds?: string[], metric: string = 'total_income') {
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

/**
 * Hook to fetch company details
 */
export function useCompanyDetails(companyId?: string) {
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

/**
 * Hook to fetch director details
 */
export function useDirectorDetails(directorId?: string) {
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
