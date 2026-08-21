import { query } from "./mysql";
import { RowDataPacket } from "mysql2/promise";

export type MarketMetric =
  | "avg_close_price"
  | "median_close_price"
  | "avg_dom"
  | "list_to_close_ratio"
  | "price_per_sqft"
  | "sales_count";

export interface MarketMetricInput {
  city: string;
  metric: MarketMetric;
  propertyType?: string;
  months?: number;
}

export interface MarketMetricResult {
  city: string;
  metric: MarketMetric;
  propertyType: string;
  months: number;
  value: number | null;
}

interface MetricRow extends RowDataPacket {
  value: number | null;
}

export async function getMarketMetric(
  input: MarketMetricInput
): Promise<MarketMetricResult> {
  const {
    city,
    metric,
    propertyType = "Residential",
    months = 12,
  } = input;

  // 1. Build WHERE conditions
  const conditions: string[] = [];
  const params: any[] = [];

  if (city) {
    conditions.push("City = ?");
    params.push(city);
  }

  if (propertyType) {
    conditions.push("PropertyType = ?");
    params.push(propertyType);
  }

  if (months) {
    conditions.push(
      "CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)"
    );
    params.push(months);
  }

  const whereClause = conditions.join(" AND ");

  // 2. Build the SQL expression for the requested metric
  let metricSql: string;

  switch (metric) {
    case "avg_close_price":
      metricSql = `
        SELECT
          AVG(ClosePrice) AS value
        FROM california_sold
        WHERE ${whereClause}
          AND ClosePrice IS NOT NULL
      `;
      break;

    case "avg_dom":
      metricSql = `
        SELECT
          AVG(DaysOnMarket) AS value
        FROM california_sold
        WHERE ${whereClause}
          AND DaysOnMarket IS NOT NULL
      `;
      break;

    case "list_to_close_ratio":
      metricSql = `
        SELECT
          AVG(ClosePrice / NULLIF(ListPrice, 0)) * 100 AS value
        FROM california_sold
        WHERE ${whereClause}
          AND ClosePrice IS NOT NULL
      `;
      break;

    case "price_per_sqft":
      metricSql = `
        SELECT
          AVG(ClosePrice / NULLIF(LivingArea, 0)) AS value
        FROM california_sold
        WHERE ${whereClause}
          AND ClosePrice IS NOT NULL
      `;
      break;

    case "sales_count":
      metricSql = `
        SELECT
          COUNT(*) AS value
        FROM california_sold
        WHERE ${whereClause}
      `;
      break;

    case "median_close_price":
      metricSql = `
        WITH ranked AS (
          SELECT
            ClosePrice,
            ROW_NUMBER() OVER (ORDER BY ClosePrice) AS rn,
            COUNT(*) OVER () AS cnt
          FROM california_sold
          WHERE ${whereClause}
            AND ClosePrice IS NOT NULL
        )
        SELECT
          AVG(ClosePrice) AS value
        FROM ranked
        WHERE rn IN (
          FLOOR((cnt + 1) / 2),
          FLOOR((cnt + 2) / 2)
        )
      `;
      break;

    default: {
      const exhaustiveCheck: never = metric;
      throw new Error(`Unsupported market metric: ${exhaustiveCheck}`);
    }
  }

  // 3. Run the requested metric query
  const rows = await query<MetricRow>(metricSql, params);
  const value = rows[0]?.value ?? null;

  // 4. Return structured result
  return {
    city,
    metric,
    propertyType,
    months,
    value,
  };
}
