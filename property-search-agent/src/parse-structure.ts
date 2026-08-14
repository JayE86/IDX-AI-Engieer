import type { RowDataPacket } from "mysql2";

export interface PropertyFilters {
  city?: string;

  minPrice?: number;
  maxPrice?: number;

  minBeds?: number;
  maxBeds?: number;

  minBaths?: number;
  maxBaths?: number;

  minSqft?: number;
  maxSqft?: number;

  minHOA?: number;
  maxHOA?: number;

  propertyType?: string;

  pool?: string;
  hasView?: string;
}

export interface ListingRow extends RowDataPacket {
  id: string;
  displayId: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  yearBuilt: number | null;
  daysOnMarket: number | null;
  pool: string | null;
  hasView: string | null;
  photoCount: number | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  officeName: string | null;
}