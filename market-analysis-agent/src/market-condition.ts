import { query } from "./mysql";
import { RowDataPacket } from "mysql2/promise";
import { getMarketMetric } from "./market-metrics";
import {
  getMarketTrend,
  MarketTrendResult,
} from "./market-trend";

export type MarketConditionType =
  | "buyer_seller_market"
  | "competitiveness"
  | "good_time_to_buy";

export interface MarketConditionInput {
  city: string;
  condition: MarketConditionType;
  propertyType?: string;
  months?: number;
}

export type BuyerSellerMarket =
  | "sellers_market"
  | "balanced_market"
  | "buyers_market"
  | "insufficient_data";

export interface BuyerSellerMarketResult {
  condition: "buyer_seller_market";
  city: string;
  propertyType: string;
  months: number;
  avgDaysOnMarket: number | null;
  marketType: BuyerSellerMarket;
}

export type CompetitivenessLevel =
  | "competitive"
  | "not_competitive"
  | "insufficient_data";

export interface CompetitivenessResult {
  condition: "competitiveness";
  city: string;
  propertyType: string;
  months: number;
  listToOriginalPriceRatio: number | null;
  ratioAboveOne: number | null;
  competitiveness: CompetitivenessLevel;
}

export type BuyerFavorabilityRating =
  | "wonderful"
  | "good"
  | "somewhat_good"
  | "not_so_great"
  | "worst";

export interface BuyerIndicator {
  metric:
    | "close_price"
    | "avg_dom"
    | "price_per_sqft"
    | "list_to_original_price_ratio"
    | "sales_count";
  slope: number | null;
  slopeUnit: string | null;
  favorable: boolean;
  monthlyData: {
    month: string;
    value: number;
  }[];
}

export interface GoodTimeToBuyResult {
  condition: "good_time_to_buy";
  city: string;
  propertyType: string;
  months: 3;
  score: number;
  rating: BuyerFavorabilityRating;
  indicators: BuyerIndicator[];
}

export type MarketConditionResult =
  | BuyerSellerMarketResult
  | CompetitivenessResult
  | GoodTimeToBuyResult;

interface RatioRow extends RowDataPacket {
  value: number | string | null;
}

function classifyBuyerSellerMarket(
  avgDaysOnMarket: number | null
): BuyerSellerMarket {
  if (avgDaysOnMarket === null) {
    return "insufficient_data";
  }

  if (avgDaysOnMarket < 30) {
    return "sellers_market";
  }

  if (avgDaysOnMarket <= 60) {
    return "balanced_market";
  }

  return "buyers_market";
}

function classifyCompetitiveness(
  ratio: number | null
): CompetitivenessLevel {
  if (ratio === null) {
    return "insufficient_data";
  }

  return ratio > 1 ? "competitive" : "not_competitive";
}

function getBuyerFavorabilityRating(
  score: number
): BuyerFavorabilityRating {
  if (score >= 5) {
    return "wonderful";
  }

  if (score === 4) {
    return "good";
  }

  if (score === 3) {
    return "somewhat_good";
  }

  if (score === 2) {
    return "not_so_great";
  }

  return "worst";
}

function buildBuyerIndicator(
  trend: MarketTrendResult,
  favorableWhenPositive: boolean
): BuyerIndicator {
  const slope = trend.slope;

  let favorable = false;

  if (slope !== null) {
    favorable = favorableWhenPositive
      ? slope > 0
      : slope < 0;
  }

  return {
    metric: trend.metric,
    slope,
    slopeUnit: trend.slopeUnit,
    favorable,
    monthlyData: trend.monthlyData,
  };
}

async function getListToOriginalPriceRatio(
  city: string,
  propertyType: string,
  months: number
): Promise<number | null> {
  const sql = `
    SELECT
      AVG(ClosePrice / NULLIF(OriginalListPrice, 0)) AS value
    FROM california_sold
    WHERE City = ?
      AND PropertyType = ?
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND ClosePrice IS NOT NULL
      AND OriginalListPrice IS NOT NULL
  `;

  const rows = await query<RatioRow>(sql, [
    city,
    propertyType,
    months,
  ]);

  const value = rows[0]?.value;

  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}

async function getBuyerSellerMarket(
  city: string,
  propertyType: string,
  months: number
): Promise<BuyerSellerMarketResult> {
  const domResult = await getMarketMetric({
    city,
    metric: "avg_dom",
    propertyType,
    months,
  });

  return {
    condition: "buyer_seller_market",
    city,
    propertyType,
    months,
    avgDaysOnMarket: domResult.value,
    marketType: classifyBuyerSellerMarket(domResult.value),
  };
}

async function getCompetitiveness(
  city: string,
  propertyType: string,
  months: number
): Promise<CompetitivenessResult> {
  const ratio = await getListToOriginalPriceRatio(
    city,
    propertyType,
    months
  );

  return {
    condition: "competitiveness",
    city,
    propertyType,
    months,
    listToOriginalPriceRatio: ratio,
    ratioAboveOne: ratio === null ? null : ratio - 1,
    competitiveness: classifyCompetitiveness(ratio),
  };
}

async function getGoodTimeToBuy(
  city: string,
  propertyType: string
): Promise<GoodTimeToBuyResult> {
  const months = 3 as const;

  const [
    closePriceTrend,
    domTrend,
    pricePerSqftTrend,
    listToOriginalRatioTrend,
    salesCountTrend,
  ] = await Promise.all([
    getMarketTrend({
      city,
      metric: "close_price",
      propertyType,
      months,
    }),
    getMarketTrend({
      city,
      metric: "avg_dom",
      propertyType,
      months,
    }),
    getMarketTrend({
      city,
      metric: "price_per_sqft",
      propertyType,
      months,
    }),
    getMarketTrend({
      city,
      metric: "list_to_original_price_ratio",
      propertyType,
      months,
    }),
    getMarketTrend({
      city,
      metric: "sales_count",
      propertyType,
      months,
    }),
  ]);

  const indicators: BuyerIndicator[] = [
    // Lower close prices are more favorable to buyers.
    buildBuyerIndicator(closePriceTrend, false),

    // Higher DOM means homes are taking longer to sell.
    buildBuyerIndicator(domTrend, true),

    // Lower price per square foot is more favorable to buyers.
    buildBuyerIndicator(pricePerSqftTrend, false),

    // A lower list-to-original-price ratio is more favorable to buyers.
    buildBuyerIndicator(listToOriginalRatioTrend, false),

    // Lower sales activity is treated as a cooling-market signal.
    buildBuyerIndicator(salesCountTrend, false),
  ];

  const score = indicators.filter(
    (indicator) => indicator.favorable
  ).length;

  return {
    condition: "good_time_to_buy",
    city,
    propertyType,
    months,
    score,
    rating: getBuyerFavorabilityRating(score),
    indicators,
  };
}

export async function getMarketCondition(
  input: MarketConditionInput
): Promise<MarketConditionResult> {
  const {
    city,
    condition,
    propertyType = "Residential",
    months = 12,
  } = input;

  switch (condition) {
    case "buyer_seller_market":
      return getBuyerSellerMarket(
        city,
        propertyType,
        months
      );

    case "competitiveness":
      return getCompetitiveness(
        city,
        propertyType,
        months
      );

    case "good_time_to_buy":
      return getGoodTimeToBuy(
        city,
        propertyType
      );

    default: {
      const exhaustiveCheck: never = condition;
      throw new Error(
        `Unsupported market condition: ${exhaustiveCheck}`
      );
    }
  }
}
