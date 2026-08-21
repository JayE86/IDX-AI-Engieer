import type { PropertyListing } from "./shared-types";

function formatValue(
  value: string | number | null | undefined,
  fallback = "unknown"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

export function buildListingText(listing: PropertyListing): string {
  const text = `
    ${formatValue(listing.propertyType)} property in ${formatValue(listing.city)},
    ${formatValue(listing.bedrooms)} bedrooms,
    ${formatValue(listing.bathrooms)} bathrooms,
    ${formatValue(listing.SquareFeet)} square feet,
    built in ${formatValue(listing.yearBuilt)},
    listed at $${formatValue(listing.price)}.
    ${formatValue(listing.remarks, "No listing description available")}
  `;

  return text.replace(/\s+/g, " ").trim();
}