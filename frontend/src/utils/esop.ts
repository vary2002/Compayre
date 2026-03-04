export type EsopSeriesPoint = {
  year: number;
  fairValue: number;
  marketValue: number;
};

export type EsopRecordLike = {
  year: number;
  esopFairValue?: string;
  optionsAggregateValue?: string;
  esopMarketValue?: string;
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[₹,]/g, "").trim();
  if (cleaned.length === 0) {
    return 0;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseCurrencyOrZero = (value?: string | null): number => {
  if (!value) {
    return 0;
  }

  return parseCurrency(value);
};

export const buildEsopValueSeries = <T extends EsopRecordLike>(records: T[]): EsopSeriesPoint[] => {
  const yearly = new Map<number, { fairValue: number; marketValue: number }>();

  records.forEach(record => {
    let fairValue = parseCurrencyOrZero(record.esopFairValue ?? record.optionsAggregateValue ?? "₹0");
    let marketValue = parseCurrencyOrZero(record.esopMarketValue ?? record.optionsAggregateValue ?? record.esopFairValue ?? "₹0");

    if (fairValue <= 0 && marketValue > 0) {
      fairValue = Math.round(marketValue * 0.85);
    }
    if (marketValue <= 0 && fairValue > 0) {
      marketValue = Math.round(fairValue * 1.1);
    }

    if (fairValue <= 0 && marketValue <= 0) {
      return;
    }

    const bucket = yearly.get(record.year) ?? { fairValue: 0, marketValue: 0 };
    bucket.fairValue += fairValue;
    bucket.marketValue += marketValue;
    yearly.set(record.year, bucket);
  });

  return Array.from(yearly.entries())
    .map(([year, values]) => ({ year, ...values }))
    .sort((a, b) => a.year - b.year);
};
