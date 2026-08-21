import { query } from "./mysql";
import { RowDataPacket } from "mysql2/promise";

export interface MarketSummaryInput {
  city?: string;
  propertyType?: string;
  months?: number;
}

export interface MarketSummaryResult {
  city?: string;
  propertyType: string;
  months: number;
  avgClosePrice: number | null;
  medianClosePrice: number | null;
  avgDaysOnMarket: number | null;
  avgListToCloseRatio: number | null;
  avgPricePerSqft: number | null;
  salesCount: number;
}

interface SummaryRow extends RowDataPacket {
  avgClosePrice: number | null;
  avgDaysOnMarket: number | null;
  avgListToCloseRatio: number | null;
  avgPricePerSqft: number | null;
  salesCount: number;
}

interface MedianRow extends RowDataPacket {
  medianClosePrice: number | null;
}

export async function getMarketSummary(
  input: MarketSummaryInput
): Promise<MarketSummaryResult> {
  const {
    city,
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
  // 2. Run aggregate query
  const summarysql = `
    Select 
      Avg(ClosePrice) As avgClosePrice,
      Avg(DaysOnMarket) As avgDaysOnMarket,
      Avg(ClosePrice / NULLIF(ListPrice, 0)) * 100 As avgListToCloseRatio,
      Avg(ClosePrice / NULLIF(LivingArea, 0)) As avgPricePerSqft,
      Count(*) As salesCount
    From california_sold
    Where ${whereClause}
  `;
  // 3. Calculate median
  const medianSql = `
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
      AVG(ClosePrice) AS medianClosePrice
    FROM ranked
    WHERE rn IN (
      FLOOR((cnt + 1) / 2),
      FLOOR((cnt + 2) / 2)
    )
  `;
  // 4. Return structured result
  const summaryRows = await query<SummaryRow>(
    summarysql,
    params
  );

  const medianRows = await query<MedianRow>(
    medianSql,
    params
  );
  const summary = summaryRows[0];
  const median = medianRows[0];

  return {
    city,
    propertyType,
    months,

    avgClosePrice: summary.avgClosePrice,
    medianClosePrice: median.medianClosePrice,
    avgDaysOnMarket: summary.avgDaysOnMarket,
    avgListToCloseRatio: summary.avgListToCloseRatio,
    avgPricePerSqft: summary.avgPricePerSqft,
    salesCount: summary.salesCount
  };
}