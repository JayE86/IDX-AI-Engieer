import {
  getMarketSummary,
  MarketSummaryResult,
} from "./market-summary";
import {
  getMarketMetric,
  MarketMetricResult,
} from "./market-metrics";
import {
  getMarketTrend,
  MarketTrendResult,
} from "./market-trend";
import {
  getMarketCondition,
  MarketConditionResult,
} from "./market-condition";
import {
  ParsedMarketQuery,
} from "./parse-user-query";

export type MarketRequest = ParsedMarketQuery;

export type MarketAnalyticsResult =
  | MarketSummaryResult
  | MarketMetricResult
  | MarketTrendResult
  | MarketConditionResult;

export interface MarketAnalyticsDependencies {
  getSummaryFn?: typeof getMarketSummary;
  getMetricFn?: typeof getMarketMetric;
  getTrendFn?: typeof getMarketTrend;
  getConditionFn?: typeof getMarketCondition;
}

function assertNonEmptyCity(city: string): void {
  if (!city || !city.trim()) {
    throw new Error("A city is required for market analytics.");
  }
}

export async function handleMarketRequest(
  request: MarketRequest,
  dependencies: MarketAnalyticsDependencies = {}
): Promise<MarketAnalyticsResult> {
  assertNonEmptyCity(request.city);

  const getSummaryFn =
    dependencies.getSummaryFn ?? getMarketSummary;
  const getMetricFn =
    dependencies.getMetricFn ?? getMarketMetric;
  const getTrendFn =
    dependencies.getTrendFn ?? getMarketTrend;
  const getConditionFn =
    dependencies.getConditionFn ?? getMarketCondition;

  switch (request.intent) {
    case "market_summary":
      return getSummaryFn({
        city: request.city,
        propertyType: request.propertyType,
        months: request.months,
      });

    case "market_metric":
      return getMetricFn({
        city: request.city,
        metric: request.metric,
        propertyType: request.propertyType,
        months: request.months,
      });

    case "market_trend":
      return getTrendFn({
        city: request.city,
        metric: request.metric,
        propertyType: request.propertyType,
        months: request.months,
      });

    case "market_condition":
      return getConditionFn({
        city: request.city,
        condition: request.condition,
        propertyType: request.propertyType,
        months: request.months,
      });

    default: {
      const exhaustiveCheck: never = request;
      throw new Error(
        `Unsupported market request: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}
