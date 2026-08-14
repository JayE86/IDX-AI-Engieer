import type { PropertyFilters } from "./parse-structure";
import type { PendingField } from "./session-memory";

type NumericRange = {
  min?: number;
  max?: number;
};

// Shared helpers

function parsePrice(value: string, suffix?: string): number {
  let numberValue = Number(value.replace(/,/g, ""));

  const normalizedSuffix = suffix?.toLowerCase();

  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") {
    numberValue *= 1_000;
  }

  if (normalizedSuffix === "m" || normalizedSuffix === "million") {
    numberValue *= 1_000_000;
  }

  if (normalizedSuffix === "b" || normalizedSuffix === "billion") {
    numberValue *= 1_000_000_000;
  }

  return numberValue;
}

function parseNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function isHOAContext(
  query: string,
  matchIndex: number,
  matchedText: string
): boolean {
  const beforeMatch = query.slice(0, matchIndex);
  const afterMatch = query.slice(matchIndex + matchedText.length);

  const hoaBefore =
    /\b(?:hoa(?:\s+fee)?|association\s+fee)\s*$/i.test(beforeMatch);

  const hoaAfter =
    /^\s*(?:hoa(?:\s+fee)?|association\s+fee)\b/i.test(afterMatch);

  return hoaBefore || hoaAfter;
}

// Numeric range extractors

function parsePriceRange(query: string): NumericRange {
  const priceToken =
    String.raw`(?=\$|[\d,.]+\s*(?:k|m|b|thousand|million|billion)\b)` +
    String.raw`\$?\s*([\d,.]+)\s*(k|m|b|thousand|million|billion)?\b`;

  function findNonHOAMatch(pattern: RegExp): RegExpExecArray | null {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(query)) !== null) {
      if (!isHOAContext(query, match.index, match[0])) {
        return match;
      }

      if (match[0].length === 0) {
        pattern.lastIndex++;
      }
    }

    return null;
  }

  // Range
  const rangeMatch = findNonHOAMatch(
    new RegExp(
      String.raw`(?:between\s+)?${priceToken}\s+(?:and|to|-)\s+${priceToken}`,
      "gi"
    )
  );

  if (rangeMatch?.[1] && rangeMatch?.[3]) {
    return {
      min: parsePrice(rangeMatch[1], rangeMatch[2]),
      max: parsePrice(rangeMatch[3], rangeMatch[4]),
    };
  }

  // Exact
  const exactMatch = findNonHOAMatch(
    new RegExp(
      String.raw`(?:exactly|exact)\s+${priceToken}`,
      "gi"
    )
  );

  if (exactMatch?.[1]) {
    const value = parsePrice(exactMatch[1], exactMatch[2]);

    return {
      min: value,
      max: value,
    };
  }

  // Maximum
  const maxMatch = findNonHOAMatch(
    new RegExp(
      String.raw`(?:under|below|less than|at most|up to|max(?:imum)?)\s+${priceToken}`,
      "gi"
    )
  );

  if (maxMatch?.[1]) {
    return {
      max: parsePrice(maxMatch[1], maxMatch[2]),
    };
  }

  // Minimum
  const minMatch = findNonHOAMatch(
    new RegExp(
      String.raw`(?:over|above|more than|at least|min(?:imum)?)\s+${priceToken}`,
      "gi"
    )
  );

  if (minMatch?.[1]) {
    return {
      min: parsePrice(minMatch[1], minMatch[2]),
    };
  }

  return {};
}

function parseBedsRange(query: string): NumericRange {
  // Range case
  const rangeMatch = query.match(
    /(?:between\s+)?(\d+)\s+(?:and|to|-)\s+(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
    };
  }

  // Exact case
  const exactMatch = query.match(
    /(?:exactly|exact)\s+(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  if (exactMatch?.[1]) {
    const value = Number(exactMatch[1]);
    return { min: value, max: value };
  }

  // Maximum case
  const maxMatch = query.match(
    /(?:under|below|less than|at most|up to|max(?:imum)?)\s+(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  if (maxMatch?.[1]) {
    return { max: Number(maxMatch[1]) };
  }

  // Minimum case
  const minMatch = query.match(
    /(?:over|above|more than|at least|min(?:imum)?(?:\s+of)?)\s+(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  if (minMatch?.[1]) {
    return { min: Number(minMatch[1]) };
  }

  // Exact case
  const plainMatch = query.match(
    /(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  if (plainMatch?.[1]) {
    const value = Number(plainMatch[1]);
    return { min: value, max: value };
  }

  return {};
}

function parseBathsRange(query: string): NumericRange {
  // Range 
  const rangeMatch = query.match(
    /(?:between\s+)?(\d+(?:\.\d+)?)\s+(?:and|to|-)\s+(\d+(?:\.\d+)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
    };
  }

  // Exact match
  const exactMatch = query.match(
    /(?:exactly|exact)\s+(\d+(?:\.\d+)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  if (exactMatch?.[1]) {
    const value = Number(exactMatch[1]);
    return { min: value, max: value };
  }

  // Max case
  const maxMatch = query.match(
    /(?:under|below|less than|at most|up to|max(?:imum)?)\s+(\d+(?:\.\d+)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  if (maxMatch?.[1]) {
    return { max: Number(maxMatch[1]) };
  }

  // Min case
  const minMatch = query.match(
    /(?:over|above|more than|at least|min(?:imum)?(?:\s+of)?)\s+(\d+(?:\.\d+)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  if (minMatch?.[1]) {
    return { min: Number(minMatch[1]) };
  }


  const plainMatch = query.match(
    /(\d+(?:\.\d+)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  if (plainMatch?.[1]) {
    const value = Number(plainMatch[1]);
    return { min: value, max: value };
  }

  return {};
}

function parseSqftRange(query: string): NumericRange {
  const unit = String.raw`(?:sqft|sq\s*ft|square\s*feet|square\s*foot)`;

  // Range case
  const rangeMatch = query.match(
    new RegExp(
      String.raw`(?:between\s+)?([\d,]+)\s+(?:and|to|-)\s+([\d,]+)\s*${unit}\b`,
      "i"
    )
  );

  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    return {
      min: parseNumber(rangeMatch[1]),
      max: parseNumber(rangeMatch[2]),
    };
  }

  //Exact case
  const exactMatch = query.match(
    new RegExp(
      String.raw`(?:exactly|exact)\s+([\d,]+)\s*${unit}\b`,
      "i"
    )
  );

  if (exactMatch?.[1]) {
    const value = parseNumber(exactMatch[1]);
    return { min: value, max: value };
  }

  // Max case
  const maxMatch = query.match(
    new RegExp(
      String.raw`(?:under|below|less than|at most|up to|max(?:imum)?)\s+([\d,]+)\s*${unit}\b`,
      "i"
    )
  );

  if (maxMatch?.[1]) {
    return { max: parseNumber(maxMatch[1]) };
  }

  //Min Case
  const minMatch = query.match(
    new RegExp(
      String.raw`(?:over|above|more than|at least|min(?:imum)?(?:\s+of)?)\s+([\d,]+)\s*${unit}\b`,
      "i"
    )
  );

  if (minMatch?.[1]) {
    return { min: parseNumber(minMatch[1]) };
  }

  const plainMatch = query.match(
    new RegExp(String.raw`([\d,]+)\s*${unit}\b`, "i")
  );

  if (plainMatch?.[1]) {
    const value = parseNumber(plainMatch[1]);
    return { min: value, max: value };
  }

  return {};
}

function parseHOARange(query: string): NumericRange {
  const hoaLabel = String.raw`(?:hoa|hoa\s+fee|association\s+fee)`;

  // Range case
  const rangeAfterLabel = query.match(
    new RegExp(
      String.raw`${hoaLabel}\s*(?:between\s+)?\$?\s*([\d,.]+)\s+(?:and|to|-)\s+\$?\s*([\d,.]+)`,
      "i"
    )
  );

  if (rangeAfterLabel?.[1] && rangeAfterLabel?.[2]) {
    return {
      min: parseNumber(rangeAfterLabel[1]),
      max: parseNumber(rangeAfterLabel[2]),
    };
  }

  const rangeBeforeLabel = query.match(
    new RegExp(
      String.raw`(?:between\s+)?\$?\s*([\d,.]+)\s+(?:and|to|-)\s+\$?\s*([\d,.]+)\s*${hoaLabel}`,
      "i"
    )
  );

  if (rangeBeforeLabel?.[1] && rangeBeforeLabel?.[2]) {
    return {
      min: parseNumber(rangeBeforeLabel[1]),
      max: parseNumber(rangeBeforeLabel[2]),
    };
  }

  // Maximum case
  const maxAfterLabel = query.match(
    new RegExp(
      String.raw`${hoaLabel}\s*(?:under|below|less than|at most|up to|max(?:imum)?)\s*\$?\s*([\d,.]+)`,
      "i"
    )
  );

  const maxBeforeLabel = query.match(
    new RegExp(
      String.raw`(?:under|below|less than|at most|up to|max(?:imum)?)\s*\$?\s*([\d,.]+)\s*${hoaLabel}`,
      "i"
    )
  );

  const maxValue = maxAfterLabel?.[1] ?? maxBeforeLabel?.[1];

  if (maxValue) {
    return { max: parseNumber(maxValue) };
  }

  // Minimum case
  const minAfterLabel = query.match(
    new RegExp(
      String.raw`${hoaLabel}\s*(?:over|above|more than|at least|min(?:imum)?)\s*\$?\s*([\d,.]+)`,
      "i"
    )
  );

  const minBeforeLabel = query.match(
    new RegExp(
      String.raw`(?:over|above|more than|at least|min(?:imum)?)\s*\$?\s*([\d,.]+)\s*${hoaLabel}`,
      "i"
    )
  );

  const minValue = minAfterLabel?.[1] ?? minBeforeLabel?.[1];

  if (minValue) {
    return { min: parseNumber(minValue) };
  }

  // Exact case
  const exactMatch = query.match(
    new RegExp(
      String.raw`${hoaLabel}\s*(?:exactly|exact)\s*\$?\s*([\d,.]+)`,
      "i"
    )
  );

  if (exactMatch?.[1]) {
    const value = parseNumber(exactMatch[1]);
    return { min: value, max: value };
  }

  return {};
}

// Categorical extractors

function parseCity(query: string): string | undefined {
  const cityMatch = query.match(
    /\b(?:in|near|around)\s+([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:under|below|less than|at most|up to|max|maximum|over|above|more than|at least|min|minimum|between|with|without|having|\d+\s*[-]?\s*(?:bed|bath))\b|[,.!?]|$)/i
  );

  return cityMatch?.[1]?.trim() || undefined;
}

function parsePropertyType(query: string): string | undefined {
  const typePatterns: Array<[RegExp, string]> = [
    [/\bboat\s*slips?\b/i, "BoatSlip"],

    [/\bcabins?\b/i, "Cabin"],

    [/\bcondos?\b|\bcondominiums?\b/i, "Condominium"],

    [/\bco[-\s]?ownership\b/i, "CoOwnership"],

    [/\bduplex(?:es)?\b/i, "Duplex"],

    [/\bfarms?\b/i, "Farm"],

    [/\blofts?\b/i, "Loft"],

    [/\bmanufactured\s+on\s+land\b/i, "ManufacturedOnLand"],

    [/\bmanufactured\s+homes?\b/i, "ManufacturedHome"],

    [/\bmixed[-\s]?use\b/i, "MixedUse"],

    [/\bmobile\s+homes?\b/i, "MobileHome"],

    [/\bown[-\s]?your[-\s]?own\b/i, "OwnYourOwn"],

    [/\bquadruplex(?:es)?\b|\bfourplex(?:es)?\b/i, "Quadruplex"],

    [
      /\bsingle[-\s]?family(?:\s+(?:home|house|residence))?\b/i,
      "SingleFamilyResidence",
    ],

    [/\bstock\s+co-?ops?\b|\bstock\s+cooperatives?\b/i, "StockCooperative"],

    [/\bstudios?\b/i, "Studio"],

    [/\btimeshares?\b/i, "Timeshare"],

    [/\btown\s*homes?\b|\btownhouses?\b/i, "Townhouse"],

    [/\btriplex(?:es)?\b/i, "Triplex"],
  ];

  for (const [pattern, propertyType] of typePatterns) {
    if (pattern.test(query)) {
      return propertyType;
    }
  }

  return undefined;
}

// Boolean-like extractors

function parsePool(query: string): string | undefined {
  if (/\b(?:no|without)\s+(?:a\s+)?pool\b/i.test(query)) {
    return "False";
  }

  if (/\bpool\b/i.test(query)) {
    return "True";
  }

  return undefined;
}

function parseView(query: string): string | undefined {
  if (/\b(?:no|without)\s+(?:a\s+)?view\b/i.test(query)) {
    return "False";
  }

  if (/\bview\b/i.test(query)) {
    return "True";
  }

  return undefined;
}


function parsePendingCity(
  query: string,
  pendingField: PendingField | null
): string | undefined {
  if (pendingField !== "city") {
    return undefined;
  }

  const value = query.trim();

  return value || undefined;
}

function parsePendingPrice(
  query: string,
  pendingField: PendingField | null
): number | undefined {
  if (pendingField !== "price") {
    return undefined;
  }

  const match = query
    .trim()
    .match(/^\$?\s*([\d,.]+)\s*(k|m|b|thousand|million|billion)?$/i);

  if (!match?.[1]) {
    return undefined;
  }

  return parsePrice(match[1], match[2]);
}

function parsePendingNumber(
  query: string,
  pendingField: PendingField | null,
  expectedField: "beds" | "baths"
): number | undefined {
  if (pendingField !== expectedField) {
    return undefined;
  }

  const match = query.trim().match(/^(\d+(?:\.\d+)?)$/);

  if (!match?.[1]) {
    return undefined;
  }

  return Number(match[1]);
}

// Main parser

export function parsePropertyQuery(
  query: string,
  pendingField: PendingField | null = null
): PropertyFilters {
  const price = parsePriceRange(query);
  const beds = parseBedsRange(query);
  const baths = parseBathsRange(query);
  const sqft = parseSqftRange(query);
  const hoa = parseHOARange(query);

  const pendingPrice = parsePendingPrice(query, pendingField);
  const pendingBeds = parsePendingNumber(query, pendingField, "beds");
  const pendingBaths = parsePendingNumber(query, pendingField, "baths");

  return {
    city: parseCity(query) ?? parsePendingCity(query, pendingField),

    minPrice: price.min,
    maxPrice: price.max ?? pendingPrice,

    minBeds: beds.min ?? pendingBeds,
    maxBeds: beds.max ?? pendingBeds,

    minBaths: baths.min ?? pendingBaths,
    maxBaths: baths.max ?? pendingBaths,

    minSqft: sqft.min,
    maxSqft: sqft.max,

    minHOA: hoa.min,
    maxHOA: hoa.max,

    propertyType: parsePropertyType(query),

    pool: parsePool(query),
    hasView: parseView(query),
  };
}
