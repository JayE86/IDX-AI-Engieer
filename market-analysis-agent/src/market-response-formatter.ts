import { MarketAnalyticsResult } from "./question-type-router";
import { MarketSummaryResult } from "./market-summary";
import {
  MarketMetric,
  MarketMetricResult,
} from "./market-metrics";
import {
  MarketTrendResult,
  SlopeUnit,
  TrendMetric,
} from "./market-trend";
import {
  BuyerIndicator,
  BuyerFavorabilityRating,
  BuyerSellerMarketResult,
  CompetitivenessResult,
  GoodTimeToBuyResult,
  MarketConditionResult,
} from "./market-condition";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null): string {
  return value === null
    ? "not available"
    : currencyFormatter.format(value);
}

export function formatNumber(value: number | null): string {
  return value === null
    ? "not available"
    : numberFormatter.format(value);
}

export function formatPercent(value: number | null): string {
  return value === null
    ? "not available"
    : `${numberFormatter.format(value)}%`;
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatMonth(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function marketMetricLabel(metric: MarketMetric): string {
  const labels: Record<MarketMetric, string> = {
    avg_close_price: "average close price",
    median_close_price: "median close price",
    avg_dom: "average days on market",
    list_to_close_ratio: "average list-to-close price ratio",
    price_per_sqft: "average price per square foot",
    sales_count: "sales count",
  };

  return labels[metric];
}

function trendMetricLabel(metric: TrendMetric): string {
  const labels: Record<TrendMetric, string> = {
    close_price: "average close price",
    avg_dom: "average days on market",
    price_per_sqft: "average price per square foot",
    sales_count: "sales count",
    list_to_original_price_ratio:
      "list-to-original-price ratio",
  };

  return labels[metric];
}

function formatMarketMetricValue(
  metric: MarketMetric,
  value: number | null
): string {
  if (value === null) {
    return "not available";
  }

  switch (metric) {
    case "avg_close_price":
    case "median_close_price":
      return formatCurrency(value);

    case "avg_dom":
      return `${formatNumber(value)} days`;

    case "list_to_close_ratio":
      return formatPercent(value);

    case "price_per_sqft":
      return `${formatCurrency(value)} per square foot`;

    case "sales_count":
      return `${formatInteger(value)} sales`;
  }
}

function formatTrendValue(
  metric: TrendMetric,
  value: number
): string {
  switch (metric) {
    case "close_price":
      return formatCurrency(value);

    case "avg_dom":
      return `${formatNumber(value)} days`;

    case "price_per_sqft":
      return `${formatCurrency(value)} per square foot`;

    case "sales_count":
      return `${formatInteger(value)} sales`;

    case "list_to_original_price_ratio":
      return formatNumber(value);
  }
}

function formatSlope(
  slope: number | null,
  unit: SlopeUnit | string | null
): string {
  if (slope === null) {
    return "not available";
  }

  const sign = slope > 0 ? "+" : "";
  const rawValue = `${sign}${numberFormatter.format(slope)}`;

  switch (unit) {
    case "dollars_per_month":
      return `${sign}${currencyFormatter.format(slope)} per month`;

    case "days_per_month":
      return `${rawValue} days per month`;

    case "dollars_per_sqft_per_month":
      return `${sign}${currencyFormatter.format(slope)} per square foot per month`;

    case "sales_per_month":
      return `${rawValue} sales per month`;

    case null:
      return rawValue;

    default:
      return rawValue;
  }
}

function formatSummary(
  result: MarketSummaryResult
): string {
  const city = result.city ?? "the selected market";

  return [
    `Over the past ${result.months} months, ${formatInteger(
      result.salesCount
    )} ${result.propertyType.toLowerCase()} properties sold in ${city}.`,
    `The average close price was ${formatCurrency(
      result.avgClosePrice
    )}, while the median close price was ${formatCurrency(
      result.medianClosePrice
    )}.`,
    `Homes spent an average of ${formatNumber(
      result.avgDaysOnMarket
    )} days on the market.`,
    `The average list-to-close price ratio was ${formatPercent(
      result.avgListToCloseRatio
    )}, and the average price per square foot was ${formatCurrency(
      result.avgPricePerSqft
    )}.`,
  ].join(" ");
}

function formatMetric(
  result: MarketMetricResult
): string {
  const label = marketMetricLabel(result.metric);
  const value = formatMarketMetricValue(
    result.metric,
    result.value
  );

  return `Over the past ${result.months} months, the ${label} in ${result.city} was ${value}.`;
}

function formatTrend(
  result: MarketTrendResult
): string {
  if (result.monthlyData.length === 0) {
    return `No valid monthly data was available for the ${trendMetricLabel(
      result.metric
    )} in ${result.city} over the past ${result.months} months.`;
  }

  const monthlyText = result.monthlyData
    .map(
      (row) =>
        `${formatMonth(row.month)}: ${formatTrendValue(
          result.metric,
          row.value
        )}`
    )
    .join("; ");

  const slopeText = formatSlope(
    result.slope,
    result.slopeUnit
  );

  return `For ${result.city}, the ${trendMetricLabel(
    result.metric
  )} over the past ${result.months} months was ${monthlyText}. The linear-regression slope was ${slopeText}.`;
}

function formatBuyerSellerMarket(
  result: BuyerSellerMarketResult
): string {
  if (
    result.marketType === "insufficient_data" ||
    result.avgDaysOnMarket === null
  ) {
    return `There was not enough valid days-on-market data to classify ${result.city} as a buyer's, seller's, or balanced market.`;
  }

  const marketLabels = {
    sellers_market: "seller's market",
    balanced_market: "balanced market",
    buyers_market: "buyer's market",
  } as const;

  return `The average days on market in ${result.city} over the past ${result.months} months was ${formatNumber(
    result.avgDaysOnMarket
  )} days. Based on the rule of under 30 days for a seller's market, 30–60 days for a balanced market, and over 60 days for a buyer's market, this is a ${
    marketLabels[result.marketType]
  }.`;
}

function formatCompetitiveness(
  result: CompetitivenessResult
): string {
  if (
    result.competitiveness === "insufficient_data" ||
    result.listToOriginalPriceRatio === null
  ) {
    return `There was not enough valid list-to-original-price data to assess market competitiveness in ${result.city}.`;
  }

  const ratio = formatNumber(
    result.listToOriginalPriceRatio
  );

  if (result.competitiveness === "competitive") {
    return `The average list-to-original-price ratio in ${result.city} over the past ${result.months} months was ${ratio}. Because the ratio is above 1, homes were selling above their original asking price on average, which indicates a competitive market under this rule.`;
  }

  return `The average list-to-original-price ratio in ${result.city} over the past ${result.months} months was ${ratio}. Because the ratio is not above 1, the market is not classified as competitive under this rule.`;
}

function ratingText(
  rating: BuyerFavorabilityRating
): string {
  const labels: Record<BuyerFavorabilityRating, string> = {
    wonderful: "wonderful",
    good: "good",
    somewhat_good: "somewhat good",
    not_so_great: "not so great",
    worst: "poor",
  };

  return labels[rating];
}

function indicatorLabel(
  metric: BuyerIndicator["metric"]
): string {
  const labels: Record<
    BuyerIndicator["metric"],
    string
  > = {
    close_price: "Close price",
    avg_dom: "Average days on market",
    price_per_sqft: "Price per square foot",
    list_to_original_price_ratio:
      "List-to-original-price ratio",
    sales_count: "Sales count",
  };

  return labels[metric];
}

function formatGoodTimeToBuy(
  result: GoodTimeToBuyResult
): string {
  const indicatorText = result.indicators
    .map((indicator) => {
      const status = indicator.favorable
        ? "buyer-favorable"
        : "not buyer-favorable";

      return `${indicatorLabel(
        indicator.metric
      )}: slope ${formatSlope(
        indicator.slope,
        indicator.slopeUnit
      )} (${status})`;
    })
    .join("; ");

  return `Based on the most recent 3 months, ${result.city} scored ${result.score}/5 on your buyer-favorability indicators, which you classify as ${ratingText(
    result.rating
  )}. ${indicatorText}.`;
}

function formatCondition(
  result: MarketConditionResult
): string {
  switch (result.condition) {
    case "buyer_seller_market":
      return formatBuyerSellerMarket(result);

    case "competitiveness":
      return formatCompetitiveness(result);

    case "good_time_to_buy":
      return formatGoodTimeToBuy(result);

    default: {
      const exhaustiveCheck: never = result;
      throw new Error(
        `Unsupported market condition result: ${JSON.stringify(
          exhaustiveCheck
        )}`
      );
    }
  }
}

function isConditionResult(
  result: MarketAnalyticsResult
): result is MarketConditionResult {
  return "condition" in result;
}

function isTrendResult(
  result: MarketAnalyticsResult
): result is MarketTrendResult {
  return (
    "slope" in result &&
    "monthlyData" in result
  );
}

function isMetricResult(
  result: MarketAnalyticsResult
): result is MarketMetricResult {
  return (
    "metric" in result &&
    "value" in result &&
    !("slope" in result)
  );
}

/**
 * Converts a structured market analytics result into user-facing text.
 *
 * The new analytics result objects no longer contain an "intent" field,
 * so the formatter identifies the result shape and delegates to the
 * correct formatter.
 */
export function formatMarketResponse(
  result: MarketAnalyticsResult
): string {
  if (isConditionResult(result)) {
    return formatCondition(result);
  }

  if (isTrendResult(result)) {
    return formatTrend(result);
  }

  if (isMetricResult(result)) {
    return formatMetric(result);
  }

  return formatSummary(result as MarketSummaryResult);
}
